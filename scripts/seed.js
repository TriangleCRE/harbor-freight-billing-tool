#!/usr/bin/env node
"use strict";

// Creates the tables (if missing) and loads the seed data — but only into
// tables that are completely empty, so this can never overwrite real data.
// This runs the exact same code the live site runs automatically on first
// use (see lib/ensureSchema.js); running it by hand is purely optional,
// e.g. to provision/inspect a database before the site's first real visit.
//
// Usage:  DATABASE_URL="postgres://..." node scripts/seed.js

const { ensureSchemaAndSeed } = require("../lib/ensureSchema");
const { getPool } = require("../lib/db");

async function main() {
  const results = await ensureSchemaAndSeed();
  results.forEach((r) => {
    console.log(
      r.seeded
        ? `${r.table}: seeded ${r.count} row(s).`
        : `${r.table}: already has ${r.count} row(s) — left untouched.`
    );
  });
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
