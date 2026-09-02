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
];

module.exports = { PATCHES };
