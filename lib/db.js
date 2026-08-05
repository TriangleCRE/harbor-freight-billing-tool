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
    pool = new Pool({ connectionString: cs, max: 5 });
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

async function withTransaction(fn) {
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
