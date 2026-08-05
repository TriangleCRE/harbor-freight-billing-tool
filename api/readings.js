"use strict";

const { query } = require("../lib/db");
const { rowToReading } = require("../lib/mappers");
const { requireAuth, readJsonBody, sendError, withErrorHandling } = require("../lib/apiUtil");

// GET  /api/readings  -> list all meter reading log entries
// POST /api/readings  -> add a new reading entry for a date
module.exports = withErrorHandling(async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === "GET") {
    const { rows } = await query("SELECT * FROM readings ORDER BY reading_date ASC");
    res.status(200).json(rows.map(rowToReading));
    return;
  }

  if (req.method === "POST") {
    const b = readJsonBody(req);
    if (!b.date) {
      sendError(res, 400, "date is required");
      return;
    }
    const { rows } = await query(
      `INSERT INTO readings (reading_date, readings) VALUES ($1,$2) RETURNING *`,
      [b.date, JSON.stringify(b.readings || {})]
    );
    res.status(201).json(rowToReading(rows[0]));
    return;
  }

  sendError(res, 405, "method not allowed");
});
