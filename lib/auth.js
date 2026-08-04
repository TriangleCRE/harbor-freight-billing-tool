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

module.exports = {
  COOKIE_NAME,
  MAX_AGE_MS,
  checkPasscode,
  makeSessionCookieValue,
  isValidSessionCookie,
};
