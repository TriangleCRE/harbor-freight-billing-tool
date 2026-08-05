"use strict";

const { query } = require("../lib/db");
const { rowToBill } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// GET  /api/bills  -> list all bills
// POST /api/bills  -> create a new bill
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    const { rows } = await query("SELECT * FROM bills ORDER BY period_end ASC NULLS LAST");
    res.status(200).json(rows.map(rowToBill));
    return;
  }

  if (req.method === "POST") {
    const b = readJsonBody(req);
    if (!b.id) {
      sendError(res, 400, "id is required");
      return;
    }
    const { rows } = await query(
      `INSERT INTO bills
        (id, period_start, period_end, invoice_date, due_date, water, fm,
         master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
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
    res.status(201).json(rowToBill(rows[0]));
    return;
  }

  sendError(res, 405, "method not allowed");
});
