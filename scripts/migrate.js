#!/usr/bin/env node
"use strict";

// Creates the tables (tenants, bills, readings) if they don't already
// exist. Does NOT load any seed data — use scripts/seed.js for that.
//
// This is purely optional: the live site creates these tables itself,
// automatically, the first time it's used against a fresh database (see
// lib/ensureSchema.js). This script exists for manual/local use — e.g. to
// provision a database ahead of time, or to inspect the schema locally.
//
// Usage:  DATABASE_URL="postgres://..." node scripts/migrate.js

const { ensureTablesOnly } = require("../lib/ensureSchema");
const { getPool } = require("../lib/db");

async function main() {
  await ensureTablesOnly();
  console.log("Tables ensured: tenants, bills, readings.");
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
