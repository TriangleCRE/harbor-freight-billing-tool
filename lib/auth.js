"use strict";

const crypto = require("node:crypto");

const COOKIE_NAME = "session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding

function secret() {
  return process.env.PASSCODE || "";
}

function hmac(input) {
  return crypto.createHmac("sha256", secret()).update(input).digest("base64url");
}

// Timing-safe equality that also tolerates differing input lengths
// (crypto.timingSafeEqual throws if buffer lengths differ).
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return ha.length === hb.length && crypto.timingSafeEqual(ha, hb);
}

function checkPasscode(candidate) {
  const s = secret();
  return typeof candidate === "string" && candidate.length > 0 && s.length > 0 && safeEqual(candidate, s);
}

function makeSessionCookieValue() {
  const payload = String(Date.now());
  return `${payload}.${hmac(payload)}`;
}

function isValidSessionCookie(value) {
  if (!value || typeof value !== "string" || !value.includes(".")) return false;
  const i = value.lastIndexOf(".");
  const payload = value.slice(0, i);
  const sig = value.slice(i + 1);
  if (!secret()) return false;
  if (!safeEqual(sig, hmac(payload))) return false;
  const issuedAt = Number(payload);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < MAX_AGE_MS;
}

// Cookie parsing shared with API route handlers (server.js has its own copy
// inline; this one is for anything that doesn't already parse cookies).
function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

// True if the incoming request carries a valid session cookie. Used by the
// /api/* serverless functions, which are routed directly (bypassing
// server.js's own gate middleware), so each one re-checks auth itself.
function isRequestAuthenticated(req) {
  const cookies = parseCookieHeader(req.headers && req.headers.cookie);
  return isValidSessionCookie(cookies[COOKIE_NAME]);
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_MS,
  checkPasscode,
  makeSessionCookieValue,
  isValidSessionCookie,
  parseCookieHeader,
  isRequestAuthenticated,
};
