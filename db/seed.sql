-- Harbor Freight Center billing tool — one-time schema + seed script.
-- Safe to paste into the Neon SQL Editor and run as-is; it is idempotent
-- (creates tables if missing, upserts seed rows by primary key).

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

-- ---------- Tenants ----------
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('harborfreight', 'Harbor Freight Tools #527', 'Suite 106 / Unit 106', 15922, 0.6122, '2014-11-11', '2034-11-30', NULL, false, false, 'harborfreight', NULL, 0)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('geico', 'GEICO (John Edwards)', 'Suite 102 / Unit 102', 1300, 0.077, '2016-09-01', NULL, NULL, false, false, 'geico', NULL, 1)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('ezmassage', 'EZ Massage', 'Suite 103 / Unit 103', 750, 0.03, '2021-08-01', '2027-07-31', NULL, false, false, 'ezmassage', NULL, 2)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('libertyarms', 'Liberty Arms', 'Suite 104 / Unit 104', 1800, 0.1507, '2018-11-21', '2026-11-30', NULL, false, false, 'libertyarms', NULL, 3)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('secretlair', 'Secret Lair Comics 2.0, LLC', 'Suite 105 / Unit 105', 1650, 0.063, '2020-08-12', '2030-08-31', NULL, false, false, 'secretlair', NULL, 4)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;
INSERT INTO tenants (id, name, meter_label, sqft, fm_pct, lease_from, lease_to, billed_from, require_explicit_start, meter_unconfirmed, logo_key, logo_override, sort_order)
VALUES ('ataka', 'Ataka Industries, LLC', 'Suite 101 / Unit 101 (utility closet meter — unconfirmed)', 4000, 0.0671, '2024-04-15', '2029-04-30', NULL, true, true, 'ataka', NULL, 5)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, meter_label=EXCLUDED.meter_label, sqft=EXCLUDED.sqft, fm_pct=EXCLUDED.fm_pct, lease_from=EXCLUDED.lease_from, lease_to=EXCLUDED.lease_to, billed_from=EXCLUDED.billed_from, require_explicit_start=EXCLUDED.require_explicit_start, meter_unconfirmed=EXCLUDED.meter_unconfirmed, logo_key=EXCLUDED.logo_key, sort_order=EXCLUDED.sort_order;

-- ---------- Bills ----------
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250121', '2024-12-20', '2025-01-21', '2025-01-29', '2025-02-24', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 5000, '{"ataka":30,"geico":779,"ezmassage":1711,"libertyarms":530,"secretlair":527,"harborfreight":3876}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2024-12-20","toDate":"2025-01-21"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250220', '2025-01-21', '2025-02-20', '2025-02-26', '2025-03-24', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 6000, '{"ataka":97,"geico":766,"ezmassage":1633,"libertyarms":624,"secretlair":528,"harborfreight":3425}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-01-21","toDate":"2025-02-20"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250320', '2025-02-20', '2025-03-20', '2025-03-31', '2025-04-22', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 5000, '{"ataka":34,"geico":722,"ezmassage":1540,"libertyarms":541,"secretlair":587,"harborfreight":3017}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-02-20","toDate":"2025-03-20"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250421', '2025-03-20', '2025-04-21', '2025-04-30', '2025-05-22', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 6000, '{"ataka":81,"geico":981,"ezmassage":1664,"libertyarms":605,"secretlair":640,"harborfreight":3585}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-03-20","toDate":"2025-04-21"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250520', '2025-04-21', '2025-05-20', '2025-05-29', '2025-06-23', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 5000, '{"ataka":66,"geico":1349,"ezmassage":1461,"libertyarms":542,"secretlair":557,"harborfreight":3274}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-04-21","toDate":"2025-05-20"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250620', '2025-05-20', '2025-06-20', '2025-06-26', '2025-07-22', '{"city":31.58,"tax":6.32,"sewer":20.55,"authority":27.23,"solidWaste":33,"seasonal":0}'::jsonb, '{"city":12.63,"tax":2.53}'::jsonb, 7000, '{"ataka":30,"geico":1956,"ezmassage":1672,"libertyarms":696,"secretlair":629,"harborfreight":4706}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-05-20","toDate":"2025-06-20"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250722', '2025-06-20', '2025-07-22', '2025-07-30', '2025-08-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":1.25}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 5000, '{"ataka":171,"geico":1657,"ezmassage":1725,"libertyarms":630,"secretlair":706,"harborfreight":4587}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-06-20","toDate":"2025-07-22"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250820', '2025-07-22', '2025-08-20', '2025-08-28', '2025-09-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":1.75}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 7000, '{"ataka":189,"geico":2065,"ezmassage":1493,"libertyarms":568,"secretlair":678,"harborfreight":3531}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-07-22","toDate":"2025-08-20"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20250918', '2025-08-20', '2025-09-18', '2025-09-30', '2025-10-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":1.25}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 5000, '{"ataka":150,"geico":2322,"ezmassage":1620,"libertyarms":544,"secretlair":651,"harborfreight":3208}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-08-20","toDate":"2025-09-18"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20251017', '2025-09-18', '2025-10-17', '2025-10-29', '2025-11-24', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":1.25}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 5000, '{"ataka":203,"geico":2108,"ezmassage":1600,"libertyarms":522,"secretlair":732,"harborfreight":3525}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-09-18","toDate":"2025-10-17"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20251114', '2025-10-17', '2025-11-14', '2025-11-25', '2025-12-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":1.5}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 6000, '{"ataka":191,"geico":2681,"ezmassage":1246,"libertyarms":505,"secretlair":779,"harborfreight":3935}'::jsonb, 'Invoiced', 'Nov 2025 city bill went unpaid at the time and drew a $12.03 late fee (Total Due shown as $252.66 on the invoice) — that late fee is NOT included in the water/sewer figure here, since it''s not a water/sewer or FM charge to bill back to tenants.', false, '', '{"fromDate":"2025-10-17","toDate":"2025-11-14"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20251214', '2025-11-14', '2025-12-14', NULL, NULL, '{"city":34.9,"tax":6.97,"sewer":22.79,"authority":28.54,"solidWaste":29.47,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 7000, '{"ataka":84,"geico":1831,"ezmassage":1211,"libertyarms":524,"secretlair":736,"harborfreight":4173}'::jsonb, 'Invoiced', '', true, 'Both the water/sewer and Fire Monitoring city invoices for this cycle are missing from your files (no bill numbered between #797911 and #831000). Water/sewer and FM charges here are interpolated from the surrounding Nov 2025 and Jan 2026 bills, on the same flat-rate bracket. Submeter reads for this period ARE on file (12/14/2025), so the tenant usage split itself is real, only the dollar total is estimated. Unlike March 2026, Leigh Ann''s emails don''t mention this gap directly — worth flagging to her too.', '{"fromDate":"2025-11-14","toDate":"2025-12-14"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20260115', '2025-12-15', '2026-01-15', '2026-01-29', '2026-02-23', '{"city":35.52,"tax":7.1,"sewer":23.2,"authority":29.05,"solidWaste":30,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 8000, '{"ataka":114,"geico":694,"ezmassage":1615,"libertyarms":542,"secretlair":688,"harborfreight":5175}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2025-12-14","toDate":"2026-01-15"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20260213', '2026-01-15', '2026-02-13', '2026-02-26', '2026-03-23', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 5000, '{"ataka":104,"geico":439,"ezmassage":1186,"libertyarms":472,"secretlair":683,"harborfreight":3352}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2026-01-15","toDate":"2026-02-13"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20260316', '2026-02-13', '2026-03-16', '2026-03-31', '2026-04-22', '{"city":33.13,"tax":6.63,"sewer":21.64,"authority":27.09,"solidWaste":29.85,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 6000, '{"ataka":242,"geico":477,"ezmassage":1591,"libertyarms":603,"secretlair":947,"harborfreight":4289}'::jsonb, 'Invoiced', '', true, 'The City''s water/sewer invoice for this cycle is missing from your files (sequence jumps from the Feb 26, 2026 bill straight to Apr 29, 2026) — Leigh Ann''s 6/25 follow-up email confirmed this and said the amount actually paid to the City was $118.34, so that figure is used here as the real total (not a guess), with the Water/Tax/Sewer/Authority/Solid-Waste breakdown estimated proportionally from the surrounding Feb/Apr 2026 rate structure since the itemized invoice isn''t available. The Fire Monitoring charge for this cycle IS from an actual invoice (#864122, $15.98) — only the water/sewer breakdown is estimated. Submeter usage for this period comes from real readings on file.', '{"fromDate":"2026-02-13","toDate":"2026-03-17"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20260415', '2026-03-16', '2026-04-15', '2026-04-29', '2026-05-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 7000, '{"ataka":157,"geico":471,"ezmassage":1540,"libertyarms":569,"secretlair":734,"harborfreight":3572}'::jsonb, 'Invoiced', '', false, '', '{"fromDate":"2026-03-17","toDate":"2026-04-14"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;
INSERT INTO bills (id, period_start, period_end, invoice_date, due_date, water, fm, master_usage, usage, status, notes, estimated, estimate_note, reading_bracket)
VALUES ('bill_20260515', '2026-04-15', '2026-05-15', '2026-05-28', '2026-06-22', '{"city":33.3,"tax":6.66,"sewer":21.75,"authority":27.23,"solidWaste":30,"seasonal":0}'::jsonb, '{"city":13.32,"tax":2.66}'::jsonb, 7000, '{"ataka":150,"geico":605,"ezmassage":1769,"libertyarms":661,"secretlair":842,"harborfreight":4182}'::jsonb, 'Invoiced', 'Meter swapped mid-cycle (old meter #06046128 retired at 1935, replaced by #93240428) — no impact on the billed usage/amount.', false, '', '{"fromDate":"2026-04-14","toDate":"2026-05-15"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET period_start=EXCLUDED.period_start, period_end=EXCLUDED.period_end, invoice_date=EXCLUDED.invoice_date, due_date=EXCLUDED.due_date, water=EXCLUDED.water, fm=EXCLUDED.fm, master_usage=EXCLUDED.master_usage, usage=EXCLUDED.usage, status=EXCLUDED.status, notes=EXCLUDED.notes, estimated=EXCLUDED.estimated, estimate_note=EXCLUDED.estimate_note, reading_bracket=EXCLUDED.reading_bracket;

-- ---------- Readings ----------
INSERT INTO readings (reading_date, readings)
VALUES ('2024-12-20', '{"ataka":244,"geico":97218,"ezmassage":91655,"libertyarms":74480,"secretlair":20057,"harborfreight":320939}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-01-21', '{"ataka":274,"geico":97997,"ezmassage":93366,"libertyarms":75010,"secretlair":20584,"harborfreight":324815}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-02-20', '{"ataka":371,"geico":98763,"ezmassage":94999,"libertyarms":75634,"secretlair":21112,"harborfreight":328240}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-03-20', '{"ataka":405,"geico":99485,"ezmassage":96539,"libertyarms":76175,"secretlair":21699,"harborfreight":331257}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-04-21', '{"ataka":486,"geico":100466,"ezmassage":98203,"libertyarms":76780,"secretlair":22339,"harborfreight":334842}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-05-20', '{"ataka":552,"geico":101815,"ezmassage":99664,"libertyarms":77322,"secretlair":22896,"harborfreight":338116}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-06-20', '{"ataka":582,"geico":103771,"ezmassage":101336,"libertyarms":78018,"secretlair":23525,"harborfreight":342822}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-07-22', '{"ataka":753,"geico":105428,"ezmassage":103061,"libertyarms":78648,"secretlair":24231,"harborfreight":347409}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-08-20', '{"ataka":942,"geico":107493,"ezmassage":104554,"libertyarms":79216,"secretlair":24909,"harborfreight":350940}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-09-18', '{"ataka":1092,"geico":109815,"ezmassage":106174,"libertyarms":79760,"secretlair":25560,"harborfreight":354148}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-10-17', '{"ataka":1295,"geico":111923,"ezmassage":107774,"libertyarms":80282,"secretlair":26292,"harborfreight":357673}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-11-14', '{"ataka":1486,"geico":114604,"ezmassage":109020,"libertyarms":80787,"secretlair":27071,"harborfreight":361608}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2025-12-14', '{"ataka":1570,"geico":116435,"ezmassage":110231,"libertyarms":81311,"secretlair":27807,"harborfreight":365781}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2026-01-15', '{"ataka":1684,"geico":117129,"ezmassage":111846,"libertyarms":81853,"secretlair":28495,"harborfreight":370956}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2026-02-13', '{"ataka":1788,"geico":117568,"ezmassage":113032,"libertyarms":82325,"secretlair":29178,"harborfreight":374308}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2026-03-17', '{"ataka":2030,"geico":118045,"ezmassage":114623,"libertyarms":82928,"secretlair":30125,"harborfreight":378597}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2026-04-14', '{"ataka":2187,"geico":118516,"ezmassage":116163,"libertyarms":83497,"secretlair":30859,"harborfreight":382169}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
INSERT INTO readings (reading_date, readings)
VALUES ('2026-05-15', '{"ataka":2337,"geico":119121,"ezmassage":117932,"libertyarms":84158,"secretlair":31701,"harborfreight":386351}'::jsonb)
ON CONFLICT (reading_date) DO UPDATE SET readings=EXCLUDED.readings;
