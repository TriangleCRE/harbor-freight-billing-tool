"use strict";

// Single source of truth for the database schema. Kept as a plain JS string
// (rather than a .sql file read from disk) so it's guaranteed to be bundled
// correctly wherever it's required — inside a Vercel serverless function,
// from a standalone script, doesn't matter.
//
// All statements are idempotent (IF NOT EXISTS) — safe to run on every cold
// start, not just once.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  meter_label             TEXT NOT NULL DEFAULT '',
  sqft                    NUMERIC NOT NULL DEFAULT 0,
  fm_pct                  NUMERIC NOT NULL DEFAULT 0,
  lease_from              DATE,
  lease_to                DATE,
  billed_from             DATE,
  require_explicit_start  BOOLEAN NOT NULL DEFAULT false,
  meter_unconfirmed       BOOLEAN NOT NULL DEFAULT false,
  logo_key                TEXT,
  logo_override           TEXT,
  sort_order              INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bills (
  id               TEXT PRIMARY KEY,
  period_start     DATE,
  period_end       DATE,
  invoice_date     DATE,
  due_date         DATE,
  water            JSONB NOT NULL DEFAULT '{}'::jsonb,
  fm               JSONB NOT NULL DEFAULT '{}'::jsonb,
  master_usage     NUMERIC NOT NULL DEFAULT 0,
  usage            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'Draft',
  notes            TEXT NOT NULL DEFAULT '',
  estimated        BOOLEAN NOT NULL DEFAULT false,
  estimate_note    TEXT NOT NULL DEFAULT '',
  reading_bracket  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS bills_period_end_idx ON bills (period_end);

CREATE TABLE IF NOT EXISTS readings (
  reading_date  DATE PRIMARY KEY,
  readings      JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Tracks which one-off data corrections (lib/dataPatches.js) have already
-- run, so each applies exactly once per database no matter how many times
-- the self-healing setup runs. See lib/dataPatches.js for why this exists:
-- the seed-only rows in db/seed-data.json are never re-applied once a table
-- has real data, so a fact that changes after go-live (e.g. a meter
-- identity getting confirmed) needs an actual UPDATE against the live rows,
-- not just an edit to the seed file.
CREATE TABLE IF NOT EXISTS schema_patches (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Belt-and-suspenders against stuck locks, at the role level rather than
-- the connection level. lib/db.js already sets statement_timeout /
-- idle_in_transaction_session_timeout on the pg Pool's connection config,
-- but Neon's pooled connection string goes through PgBouncer-style
-- transaction pooling, which does not reliably honor per-session settings
-- across a pooled/reused backend connection -- exactly the gap that let
-- the bills table wedge again after that fix shipped. ALTER ROLE ... SET
-- writes the timeout into the role's server-side defaults (pg_db_role_
-- setting), which Postgres itself applies to every new backend session for
-- this role no matter what's in front of it (pooler or not), so it can't
-- be silently dropped the way a per-connection SET can.
ALTER ROLE CURRENT_USER SET statement_timeout = '20s';
ALTER ROLE CURRENT_USER SET idle_in_transaction_session_timeout = '10s';
`;

module.exports = { SCHEMA_SQL };
