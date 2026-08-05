"use strict";

const { query } = require("../lib/db");
const { rowToReading } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// PUT    /api/reading?date=YYYY-MM-DD  -> merge values into an existing reading entry
// DELETE /api/reading?date=YYYY-MM-DD  -> remove a reading entry
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  const date = req.query && req.query.date;
  if (!date) {
    sendError(res, 400, "date is required");
    return;
  }

  if (req.method === "PUT") {
    const b = readJsonBody(req);
    // Shallow-merge, same as Object.assign(existing.readings, incoming) on the front end.
    const { rows } = await query(
      `UPDATE readings SET readings = readings || $2::jsonb WHERE reading_date = $1 RETURNING *`,
      [date, JSON.stringify(b.readings || {})]
    );
    if (!rows.length) {
      sendError(res, 404, "reading not found");
      return;
    }
    res.status(200).json(rowToReading(rows[0]));
    return;
  }

  if (req.method === "DELETE") {
    const { rowCount } = await query("DELETE FROM readings WHERE reading_date = $1", [date]);
    if (!rowCount) {
      sendError(res, 404, "reading not found");
      return;
    }
    res.status(204).end();
    return;
  }

  sendError(res, 405, "method not allowed");
});
