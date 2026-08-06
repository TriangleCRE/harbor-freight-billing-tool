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
//  - A Postgres advisory lock (transaction-scoped, see withSetupLock below)
//    serializes this across concurrent cold starts (multiple serverless
//    instances hitting the same database at once), so two lambdas booting
//    simultaneously can't race each other through CREATE TABLE / the
//    empty-table check. It releases automatically on commit/rollback, so
//    it can't be left stuck by a killed process the way a manually-released
//    session-level lock can.
//  - The "ready" check is cached per warm instance so it only actually
//    touches the database once per instance lifetime, not on every request.

const { getPool } = require("./db");
const { SCHEMA_SQL } = require("./schema");
const { insertTenantRow, insertBillRow, insertReadingRow } = require("./seedInserts");
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

// Runs `fn` while holding the setup advisory lock, scoped to a single
// transaction (pg_advisory_xact_lock, not pg_advisory_lock).
//
// This used to be a plain session-level pg_advisory_lock, released by hand
// in a `finally` block. That has a real failure mode: if the process is
// killed outright (e.g. a Vercel function hitting its 300s timeout) rather
// than unwinding normally, the `finally` never runs and the lock leaks --
// silently, forever, since the underlying connection can outlive the
// request (especially through a connection pooler). Every future cold
// start then blocks waiting on a lock nobody will ever release, which
// looks exactly like "all the data is gone" (the request just hangs until
// Vercel kills it too).
//
// pg_advisory_xact_lock ties the lock to the transaction instead: it's
// released automatically on COMMIT or ROLLBACK, and a `SET LOCAL
// lock_timeout` means a genuinely contended lock fails fast (a normal,
// catchable error) instead of hanging for minutes.
async function withSetupLock(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SETUP_LOCK_KEY]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Creates the tables (if missing) and seeds any table that's completely
// empty. Returns a per-table summary. Safe to call repeatedly.
async function ensureSchemaAndSeed() {
  return withSetupLock(async (client) => {
    await client.query(SCHEMA_SQL);
    const results = [];
    results.push(await seedIfEmpty(client, "tenants", SEED.tenants, insertTenantRow));
    results.push(await seedIfEmpty(client, "bills", SEED.bills, insertBillRow));
    results.push(await seedIfEmpty(client, "readings", SEED.readings, insertReadingRow));
    return results;
  });
}

// Tables only, no seeding — for scripts/migrate.js.
async function ensureTablesOnly() {
  return withSetupLock(async (client) => {
    await client.query(SCHEMA_SQL);
  });
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
