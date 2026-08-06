"use strict";

const { Pool, types } = require("pg");

// Return DATE columns as plain 'YYYY-MM-DD' strings (they have no time
// component in this app) instead of JS Date objects, and NUMERIC columns as
// JS numbers instead of strings, so API handlers can pass values straight
// through without extra conversion.
types.setTypeParser(1082 /* date */, (val) => val);
types.setTypeParser(1700 /* numeric */, (val) => (val === null ? null : parseFloat(val)));

let pool;

function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  );
}

function getPool() {
  if (!pool) {
    const cs = connectionString();
    if (!cs) {
      throw new Error(
        "No Postgres connection string found. Set DATABASE_URL (or POSTGRES_URL) in the environment."
      );
    }
    pool = new Pool({
      connectionString: cs,
      max: 5,
      // Belt-and-suspenders against a hung query holding a Vercel function
      // (and its serverless timeout) open for the full 300s: no single
      // statement should ever legitimately need more than this. Without a
      // cap, a stuck query looks identical to "all the data is gone" --
      // this turns that into a fast, visible error instead.
      statement_timeout: 30000,
      query_timeout: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Lazily required (not at module top) to avoid a circular-require deadlock:
// lib/ensureSchema.js itself requires getPool from this file. By the time
// query()/withTransaction() actually run, both modules are fully loaded, so
// this resolves fine.
function ensureSchema() {
  return require("./ensureSchema");
}

// Self-healing: every query first makes sure the tables exist and are
// seeded (see lib/ensureSchema.js). Cheap after the first call in a warm
// instance — it's just awaiting an already-resolved promise. If a query
// still fails because a table is missing (e.g. it was dropped after this
// instance already checked), reset the cached check and retry once.
async function query(text, params) {
  await ensureSchema().ensureReady();
  try {
    return await getPool().query(text, params);
  } catch (err) {
    if (err.code === "42P01" /* undefined_table */) {
      ensureSchema().resetReady();
      await ensureSchema().ensureReady();
      return await getPool().query(text, params);
    }
    throw err;
  }
}

async function withTransaction(fn) {
  await ensureSchema().ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
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

module.exports = { getPool, query, withTransaction };
