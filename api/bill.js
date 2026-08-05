"use strict";

const { query } = require("../lib/db");
const { rowToBill } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// PUT    /api/bill?id=xxx  -> update an existing bill (full replace)
// DELETE /api/bill?id=xxx  -> remove a bill
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  const id = req.query && req.query.id;
  if (!id) {
    sendError(res, 400, "id is required");
    return;
  }

  if (req.method === "PUT") {
    const b = readJsonBody(req);
    const { rows } = await query(
      `UPDATE bills SET
        period_start = $2, period_end = $3, invoice_date = $4, due_date = $5,
        water = $6, fm = $7, master_usage = $8, usage = $9, status = $10,
        notes = $11, estimated = $12, estimate_note = $13, reading_bracket = $14
       WHERE id = $1
       RETURNING *`,
      [
        id,
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
    if (!rows.length) {
      sendError(res, 404, "bill not found");
      return;
    }
    res.status(200).json(rowToBill(rows[0]));
    return;
  }

  if (req.method === "DELETE") {
    const { rowCount } = await query("DELETE FROM bills WHERE id = $1", [id]);
    if (!rowCount) {
      sendError(res, 404, "bill not found");
      return;
    }
    res.status(204).end();
    return;
  }

  sendError(res, 405, "method not allowed");
});
