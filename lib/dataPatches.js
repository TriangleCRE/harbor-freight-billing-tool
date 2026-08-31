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
];

module.exports = { PATCHES };
