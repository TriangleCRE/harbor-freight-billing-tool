"use strict";

const { isRequestAuthenticated } = require("./auth");

// Every /api/* function is routed directly (see vercel.json), bypassing
// server.js's own auth-gate middleware, so each handler re-checks the
// session cookie itself before touching the database.
function requireAuth(req, res) {
  if (!isRequestAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

// Vercel's Node runtime parses JSON bodies into req.body automatically, but
// guard against it arriving as a raw string (or missing) just in case.
function readJsonBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    if (!req.body.trim()) return {};
    return JSON.parse(req.body);
  }
  return req.body;
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

// Wraps a handler so unexpected errors (bad JSON, DB connection failures,
// etc.) come back as a clean 500 instead of a raw stack trace / crash.
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        // unique_violation — most likely a duplicate id / date
        sendError(res, 409, "a record with that identifier already exists");
        return;
      }
      sendError(res, 500, err.message || "internal error");
    }
  };
}

module.exports = { requireAuth, readJsonBody, sendError, withErrorHandling };
