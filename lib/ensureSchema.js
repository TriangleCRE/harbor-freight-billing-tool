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
//    through CREATE TABLE / the empty-table check.
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

// Creates the tables (if missing) and seeds any table that's completely
// empty. Returns a per-table summary. Safe to call repeatedly.
async function ensureSchemaAndSeed() {
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SETUP_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
    const results = [];
    results.push(await seedIfEmpty(client, "tenants", SEED.tenants, insertTenantRow));
    results.push(await seedIfEmpty(client, "bills", SEED.bills, insertBillRow));
    results.push(await seedIfEmpty(client, "readings", SEED.readings, insertReadingRow));
    return results;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SETUP_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

// Tables only, no seeding — for scripts/migrate.js.
async function ensureTablesOnly() {
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SETUP_LOCK_KEY]);
    await client.query(SCHEMA_SQL);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SETUP_LOCK_KEY]).catch(() => {});
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
