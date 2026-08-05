"use strict";

const crypto = require("node:crypto");
const { query } = require("../lib/db");
const { rowToTenant } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// GET  /api/tenants      -> list all tenants
// POST /api/tenants      -> create a tenant
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    const { rows } = await query(
      "SELECT * FROM tenants ORDER BY sort_order ASC, name ASC"
    );
    res.status(200).json(rows.map(rowToTenant));
    return;
  }

  if (req.method === "POST") {
    const body = readJsonBody(req);
    if (!body.name) {
      sendError(res, 400, "name is required");
      return;
    }
    const id = body.id || "tenant_" + crypto.randomBytes(4).toString("hex");
    const { rows: maxRows } = await query(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM tenants"
    );
    const sortOrder = maxRows[0].next;
    const { rows } = await query(
      `INSERT INTO tenants
        (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from,
         require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        id,
        body.name,
        body.meterLabel || "",
        body.sqft || 0,
        body.fmPct || 0,
        body.leaseFrom || null,
        body.leaseTo || null,
        body.billedFrom || null,
        !!body.requireExplicitStart,
        !!body.meterUnconfirmed,
        body.logoKey || null,
        body.logoOverride || null,
        sortOrder,
      ]
    );
    res.status(201).json(rowToTenant(rows[0]));
    return;
  }

  sendError(res, 405, "method not allowed");
});
