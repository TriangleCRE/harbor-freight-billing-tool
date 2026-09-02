"use strict";

// Parameterized inserts shared by the self-healing seed path
// (lib/ensureSchema.js) and the standalone scripts/seed.js, so there's one
// place that knows how to turn a seed-data.json row into a database row.
// ON CONFLICT DO NOTHING makes each of these safe to call even if a row
// with that id/date somehow already exists — it's a no-op, never an
// overwrite, so real edits are never clobbered.

const { normalizeNoteEntries } = require("./noteEntries");

async function insertTenantRow(client, t, sortOrder) {
  await client.query(
    `INSERT INTO tenants
      (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from,
       require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING`,
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
      t.logoOverride || null,
      sortOrder,
    ]
  );
}

async function insertBillRow(client, b) {
  await client.query(
    `INSERT INTO bills
      (id, period_start, period_end, invoice_date, due_date, water, fm,
       master_usage, usage, status, estimated, note_entries, reading_bracket)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING`,
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
      !!b.estimated,
      JSON.stringify(normalizeNoteEntries(b)),
      JSON.stringify(b.readingBracket || { fromDate: "", toDate: "" }),
    ]
  );
}

async function insertReadingRow(client, r) {
  await client.query(
    `INSERT INTO readings (reading_date, readings) VALUES ($1,$2)
     ON CONFLICT (reading_date) DO NOTHING`,
    [r.date, JSON.stringify(r.readings || {})]
  );
}

module.exports = { insertTenantRow, insertBillRow, insertReadingRow };
