-- Harbor Freight Center billing tool — Postgres schema.
-- Safe to run repeatedly (all statements are idempotent).

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
