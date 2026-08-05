#!/usr/bin/env node
"use strict";

// Creates the tables (if missing) and loads them with the data that used to
// be hard-coded as SEED_TENANTS / SEED_BILLS / SEED_READINGS in
// public/index.html (see db/seed-data.json). Safe to re-run: it upserts by
// primary key, so re-running just refreshes rows back to the seed values.
//
// Usage:  node db/seed.js
// Requires DATABASE_URL (or POSTGRES_URL) to be set in the environment.

const fs = require("node:fs");
const path = require("node:path");
const { query, getPool } = require("../lib/db");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf8"));

  for (let i = 0; i < seed.tenants.length; i++) {
    const t = seed.tenants[i];
    await query(
      `INSERT INTO tenants
        (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from,
         require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         meter_label = EXCLUDED.meter_label,
         sqft = EXCLUDED.sqft,
         fm_pct = EXCLUDED.fm_pct,
         lease_from = EXCLUDED.lease_from,
         lease_to = EXCLUDED.lease_to,
         billed_from = EXCLUDED.billed_from,
         require_explicit_start = EXCLUDED.require_explicit_start,
         meter_unconfirmed = EXCLUDED.meter_unconfirmed,
         logo_key = EXCLUDED.logo_key,
         sort_order = EXCLUDED.sort_order
         -- logo_override is intentionally left untouched on re-seed so a
         -- tenant's uploaded logo replacement survives a reseed.`,
      [
        t.id,
        t.name,
        t.meterLabel || "",
        t.sqft || 0,
        t.fmPct || 0,
        t.leaseFrom || null,
        t.leaseTo || null,
        t.billedFrom || null,
        !!t.requireExplicitStart,
        !!t.meterUnconfirmed,
        t.logoKey || null,
        null,
        i,
      ]
    );
  }
  console.log(`Seeded ${seed.tenants.length} tenants.`);

  for (const b of seed.bills) {
    await query(
      `INSERT INTO bills
        (id, period_start, period_end, invoice_date, due_date, water, fm,
         master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         period_start = EXCLUDED.period_start,
         period_end = EXCLUDED.period_end,
         invoice_date = EXCLUDED.invoice_date,
         due_date = EXCLUDED.due_date,
         water = EXCLUDED.water,
         fm = EXCLUDED.fm,
         master_usage = EXCLUDED.master_usage,
         usage = EXCLUDED.usage,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         estimated = EXCLUDED.estimated,
         estimate_note = EXCLUDED.estimate_note,
         reading_bracket = EXCLUDED.reading_bracket`,
      [
        b.id,
        b.periodStart || null,
        b.periodEnd || null,
        b.invoiceDate || null,
        b.dueDate || null,
        JSON.stringify(b.water || {}),
        JSON.stringify(b.fm || {}),
        b.masterUsage || 0,
        JSON.stringify(b.usage || {}),
        b.status || "Draft",
        b.notes || "",
        !!b.estimated,
        b.estimateNote || "",
        JSON.stringify(b.readingBracket || { fromDate: "", toDate: "" }),
      ]
    );
  }
  console.log(`Seeded ${seed.bills.length} bills.`);

  for (const r of seed.readings) {
    await query(
      `INSERT INTO readings (reading_date, readings) VALUES ($1,$2)
       ON CONFLICT (reading_date) DO UPDATE SET readings = EXCLUDED.readings`,
      [r.date, JSON.stringify(r.readings || {})]
    );
  }
  console.log(`Seeded ${seed.readings.length} readings.`);

  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
