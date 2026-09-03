"use strict";

// Self-healing setup: on first real use, make sure the tables exist and —
// only if a table is completely empty — load it with the seed data. This
// runs automatically from lib/db.js before any query, so the live site
// never depends on someone remembering to run a migration by hand.
//
// Safety properties this relies on:
//  - CREATE TABLE IF NOT EXISTS / the whole SCHEMA_SQL is idempotent.
//  - Each table is seeded ONLY when its row count is exactly 0, so once
//    there's any real data (even a single row), seeding never touches that
//    table again.
//  - A Postgres advisory lock serializes this across concurrent cold
//    starts (multiple serverless instances hitting the same database at
//    once), so two lambdas booting simultaneously can't race each other
//    through CREATE TABLE / the empty-table check. This only actually
//    works because the lock and everything after it run inside one
//    explicit transaction on the same client -- see the comment on
//    ensureSchemaAndSeed() below for why that part is load-bearing.
//  - The "ready" check is cached per warm instance so it only actually
//    touches the database once per instance lifetime, not on every request.

const { getPool } = require("./db");
const { SCHEMA_SQL } = require("./schema");
const { insertTenantRow, insertBillRow, insertReadingRow } = require("./seedInserts");
const { PATCHES } = require("./dataPatches");
const SEED = require("../db/seed-data.json");

// Arbitrary constant used as the advisory lock key for this app's one-time
// setup. Any fixed bigint works; it just needs to not collide with locks
// used elsewhere against the same database.
const SETUP_LOCK_KEY = 875321997;

let readyPromise = null;

async function seedIfEmpty(client, table, rows, insertRow) {
  const { rows: countRows } = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
  if (countRows[0].n > 0) {
    return { table, seeded: false, count: countRows[0].n };
  }
  for (let i = 0; i < rows.length; i++) {
    await insertRow(client, rows[i], i);
  }
  return { table, seeded: true, count: rows.length };
}

// Runs any lib/dataPatches.js entries that haven't been applied to this
// database yet, recording each in schema_patches so it never runs twice —
// including never re-running after someone edits the same row again by
// hand later. Unlike seeding, this touches rows regardless of whether the
// table already has data, because that's exactly the case it's for: a fact
// that changed after the table was already seeded/in real use.
async function applyPatches(client) {
  const applied = [];
  for (const patch of PATCHES) {
    const { rows } = await client.query("SELECT 1 FROM schema_patches WHERE id = $1", [patch.id]);
    if (rows.length) continue;
    await patch.run(client);
    await client.query("INSERT INTO schema_patches (id) VALUES ($1)", [patch.id]);
    applied.push(patch.id);
  }
  return applied;
}

// Creates the tables (if missing), seeds any table that's completely empty,
// and applies any not-yet-applied data patches. Returns a per-table
// summary. Safe to call repeatedly.
//
// Everything here runs inside one explicit BEGIN...COMMIT on a single
// client, using pg_advisory_xact_lock (transaction-scoped) instead of
// pg_advisory_lock (session-scoped) -- this isn't optional polish, it's
// what actually makes the locking work at all against Neon's pooled
// connection string. That connection routes through PgBouncer-style
// transaction pooling, which only pins one physical backend to a client
// for the duration of a single explicit transaction; between separate
// autocommit statements (which is what every statement here used to be,
// with no BEGIN anywhere), the pooler is free to hand the next statement
// to a different backend entirely. A session-scoped lock taken on backend A
// is invisible to a concurrent request whose next statement lands on
// backend B -- both sides see the lock as free and race each other into
// ALTER ROLE / CREATE TABLE / seeding at the same time. That's exactly what
// was producing real Postgres deadlocks (on pg_db_role_setting, the system
// catalog row ALTER ROLE ... SET writes to) and, when one side lost the
// race and sat blocked long enough, statement-timeout cancellations too --
// both symptoms of the *same* missing serialization, not two separate
// bugs. Wrapping the whole critical section in one transaction restores
// the backend affinity this function has always implicitly assumed it had.
async function ensureSchemaAndSeed() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SETUP_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    const results = [];
    results.push(await seedIfEmpty(client, "tenants", SEED.tenants, insertTenantRow));
    results.push(await seedIfEmpty(client, "bills", SEED.bills, insertBillRow));
    results.push(await seedIfEmpty(client, "readings", SEED.readings, insertReadingRow));
    await applyPatches(client);
    await client.query("COMMIT");
    return results;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Tables only, no seeding — for scripts/migrate.js. Same transaction-scoped
// locking as ensureSchemaAndSeed() above, for the same reason.
async function ensureTablesOnly() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SETUP_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Cached so a warm serverless instance only actually hits the database once.
// On failure the cache is cleared so the *next* request retries instead of
// every request in this instance's lifetime permanently failing on a
// transient error (e.g. the database was briefly unreachable).
function ensureReady() {
  if (!readyPromise) {
    readyPromise = ensureSchemaAndSeed().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

// Lets lib/db.js force a re-check (e.g. after a query fails with "relation
// does not exist") instead of trusting a cached success forever.
function resetReady() {
  readyPromise = null;
}

module.exports = { ensureReady, resetReady, ensureSchemaAndSeed, ensureTablesOnly };
