"use strict";

const { query } = require("../lib/db");
const { rowToTenant } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// PUT    /api/tenant?id=xxx  -> update a tenant (full or partial fields)
// DELETE /api/tenant?id=xxx  -> remove a tenant
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  const id = req.query && req.query.id;
  if (!id) {
    sendError(res, 400, "id is required");
    return;
  }

  if (req.method === "PUT") {
    const body = readJsonBody(req);
    const { rows: existingRows } = await query("SELECT * FROM tenants WHERE id = $1", [id]);
    if (!existingRows.length) {
      sendError(res, 404, "tenant not found");
      return;
    }
    const current = rowToTenant(existingRows[0]);
    const merged = Object.assign({}, current, body, { id });
    const { rows } = await query(
      `UPDATE tenants SET
        name = $2, meter_label = $3, sqft = $4, fm_pct = $5, lease_from = $6,
        lease_to = $7, billed_from = $8, require_explicit_start = $9,
        meter_unconfirmed = $10, logo_key = $11, logo_override = $12
       WHERE id = $1
       RETURNING *`,
      [
        id,
        merged.name,
        merged.meterLabel || "",
        merged.sqft || 0,
        merged.fmPct || 0,
        merged.leaseFrom || null,
        merged.leaseTo || null,
        merged.billedFrom || null,
        !!merged.requireExplicitStart,
        !!merged.meterUnconfirmed,
        merged.logoKey || null,
        merged.logoOverride || null,
      ]
    );
    res.status(200).json(rowToTenant(rows[0]));
    return;
  }

  if (req.method === "DELETE") {
    const { rowCount } = await query("DELETE FROM tenants WHERE id = $1", [id]);
    if (!rowCount) {
      sendError(res, 404, "tenant not found");
      return;
    }
    res.status(204).end();
    return;
  }

  sendError(res, 405, "method not allowed");
});
