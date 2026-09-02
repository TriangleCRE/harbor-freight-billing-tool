"use strict";

// One-off corrections to *live* row data, for facts that changed after the
// row was already seeded. db/seed-data.json only ever populates a table
// that is completely empty (see lib/ensureSchema.js) -- once the real
// tenants/bills/readings tables have rows, editing that JSON file has no
// effect on the database anyone is actually using. That gap bit us once
// already (the "storage closet" meter's confirmed-as-Ataka's update on
// 8/5/26 only ever touched db/seed-data.json, never the live "ataka" row,
// which is why it still needed fixing weeks later).
//
// A patch here is applied at most once per database: lib/ensureSchema.js
// runs each one under the same advisory lock as schema setup/seeding, then
// records its id in schema_patches so it's never re-run -- including never
// re-run after a later manual edit through the app's own UI/API.
//
// Add a new entry any time a similar "this fact changed, and it needs to
// reach the already-seeded live rows" situation comes up.
const PATCHES = [
  {
    id: "2026-08-31-ataka-meter-confirmed",
    async run(client) {
      await client.query(
        `UPDATE tenants
           SET meter_label = $2, meter_unconfirmed = false
         WHERE id = $1`,
        [
          "ataka",
          'Suite 101 / Unit 101 (formerly labeled "storage closet" — confirmed as Ataka Industries\' meter)',
        ]
      );
    },
  },
  {
    // Moves every existing bill's flat notes/estimate_note text into the
    // new note_entries structure (see lib/noteEntries.js), the same
    // mechanical rule normalizeNoteEntries() applies to any legacy-shape
    // JSON: the whole `notes` string becomes one billingNote-tagged entry,
    // the whole `estimate_note` string (when present) becomes one
    // estimateNote-tagged entry. It does NOT attempt to split a note that
    // actually describes two distinct facts into two separately-tagged
    // entries -- e.g. a note starting "TWO ISSUES. (1)... (2)..." comes
    // through as a single entry, because only a human can say which half
    // is which tag. Those need a manual follow-up split through the
    // editor (or a second, hand-written patch) once identified.
    id: "2026-09-02-bill-notes-to-note-entries",
    async run(client) {
      const { rows } = await client.query("SELECT id, notes, estimate_note FROM bills");
      for (const row of rows) {
        const entries = [];
        if (row.notes) entries.push({ text: row.notes, types: ["billingNote"] });
        if (row.estimate_note) entries.push({ text: row.estimate_note, types: ["estimateNote"] });
        if (entries.length) {
          await client.query("UPDATE bills SET note_entries = $2 WHERE id = $1", [
            row.id,
            JSON.stringify(entries),
          ]);
        }
      }
    },
  },
  {
    // Replaces all 19 periods' water/FM billing data and submeter readings
    // with the verified figures from 1854_E_Market_Water_FM_Billing.xlsx
    // (Yardi vendor ledger + invoice images, cross-checked against the
    // emailed PDFs and the GL). See db/patch-2026-09-02-water-fm-reload.json
    // for the full computed dataset -- built once, offline, from the
    // workbook (self-checked: water $2276.07 + FM $299.68 = $2575.75
    // across all 19 periods, matching the workbook's own City-invoice
    // total exactly).
    //
    // Bills: upserts by id so the 17 existing periods get their corrected
    // water/fm/usage/estimated/noteEntries/periodEnd/readingBracket without
    // touching status, invoiceDate, or dueDate (not in the UPDATE SET
    // clause, so ON CONFLICT leaves them exactly as they are); the 2 new
    // periods (May15-Jun15 and Jun15-Jul15 2026) get inserted fresh with
    // status='Draft' since no tenant invoices have gone out for them yet.
    //
    // Readings: adds the 5 period-boundary dates the tool didn't have yet
    // (2025-12-15, 2026-03-16, 2026-04-15, 2026-06-15, 2026-07-15) via
    // ON CONFLICT DO NOTHING -- never overwrites a reading that's already
    // there. Two pre-existing entries (2026-03-17, 2026-04-14) are
    // deliberately left untouched and unreferenced: they're the actual
    // NextCentury read timestamps, a day off the nominal period boundary,
    // and are kept rather than corrected or deleted.
    id: "2026-09-02-water-fm-reload-from-verified-workbook",
    async run(client) {
      const data = require("../db/patch-2026-09-02-water-fm-reload.json");

      for (const b of data.bills) {
        await client.query(
          `INSERT INTO bills
            (id, period_start, period_end, invoice_date, due_date, water, fm,
             master_usage, usage, status, estimated, note_entries, reading_bracket)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             period_end = EXCLUDED.period_end,
             water = EXCLUDED.water,
             fm = EXCLUDED.fm,
             master_usage = EXCLUDED.master_usage,
             usage = EXCLUDED.usage,
             estimated = EXCLUDED.estimated,
             note_entries = EXCLUDED.note_entries,
             reading_bracket = EXCLUDED.reading_bracket`,
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
            !!b.estimated,
            JSON.stringify(b.noteEntries || []),
            JSON.stringify(b.readingBracket || { fromDate: "", toDate: "" }),
          ]
        );
      }

      for (const r of data.newReadings) {
        await client.query(
          `INSERT INTO readings (reading_date, readings) VALUES ($1,$2)
           ON CONFLICT (reading_date) DO NOTHING`,
          [r.date, JSON.stringify(r.readings || {})]
        );
      }
    },
  },
];

module.exports = { PATCHES };
