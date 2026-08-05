"use strict";

const { withTransaction } = require("../lib/db");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// POST /api/import  -> wholesale replace of tenants/bills/readings, used by
// the "Import JSON" backup-restore button. Runs in one transaction so a
// bad backup file can't leave the database half-written.
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") {
    sendError(res, 405, "method not allowed");
    return;
  }

  const body = readJsonBody(req);
  const tenants = Array.isArray(body.tenants) ? body.tenants : [];
  const bills = Array.isArray(body.bills) ? body.bills : [];
  const readings = Array.isArray(body.readings) ? body.readings : [];

  await withTransaction(async (client) => {
    await client.query("DELETE FROM bills");
    await client.query("DELETE FROM readings");
    await client.query("DELETE FROM tenants");

    for (let i = 0; i < tenants.length; i++) {
      const t = tenants[i];
      await client.query(
        `INSERT INTO tenants
          (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from,
           require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
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
          i,
        ]
      );
    }

    for (const b of bills) {
      await client.query(
        `INSERT INTO bills
          (id, period_start, period_end, invoice_date, due_date, water, fm,
           master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
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

    for (const r of readings) {
      await client.query(
        `INSERT INTO readings (reading_date, readings) VALUES ($1,$2)`,
        [r.date, JSON.stringify(r.readings || {})]
      );
    }
  });

  res.status(200).json({ ok: true, tenants: tenants.length, bills: bills.length, readings: readings.length });
});
