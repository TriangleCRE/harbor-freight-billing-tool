"use strict";

// Converts between the snake_case DB rows and the camelCase JSON shapes the
// front end already works with (these match the SEED_TENANTS / SEED_BILLS /
// SEED_READINGS shapes that used to be hard-coded in index.html).

function rowToTenant(row) {
  return {
    id: row.id,
    name: row.name,
    meterLabel: row.meter_label || "",
    sqft: row.sqft || 0,
    fmPct: row.fm_pct || 0,
    leaseFrom: row.lease_from || null,
    leaseTo: row.lease_to || null,
    billedFrom: row.billed_from || null,
    requireExplicitStart: !!row.require_explicit_start,
    meterUnconfirmed: !!row.meter_unconfirmed,
    logoKey: row.logo_key || null,
    logoOverride: row.logo_override || null,
  };
}

function rowToBill(row) {
  return {
    id: row.id,
    periodStart: row.period_start || null,
    periodEnd: row.period_end || null,
    invoiceDate: row.invoice_date || null,
    dueDate: row.due_date || null,
    water: row.water || {},
    fm: row.fm || {},
    masterUsage: row.master_usage || 0,
    usage: row.usage || {},
    status: row.status || "Draft",
    estimated: !!row.estimated,
    noteEntries: row.note_entries || [],
    readingBracket: row.reading_bracket || { fromDate: "", toDate: "" },
  };
}

function rowToReading(row) {
  return {
    date: row.reading_date,
    readings: row.readings || {},
  };
}

module.exports = { rowToTenant, rowToBill, rowToReading };
