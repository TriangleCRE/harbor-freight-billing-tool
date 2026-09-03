"use strict";

// Shared shape for the bills.note_entries JSONB column: a list of
// { text: string, types: string[], resolved: boolean } entries. Replaces
// the older flat `notes` / `estimateNote` strings -- a bill can now carry
// several independently-tagged notes instead of one blob of text per
// field.
//
// `resolved` backs the Flags & Issues tab (public/index.html): marking an
// entry resolved there archives it instead of deleting it. It defaults to
// false, including for every entry that predates this field -- an absent
// key normalizes the same as an explicit false, so nothing already in the
// database needs a migration to read as "still open".
//
// Each entry's `types` is drawn from NOTE_TYPES:
//   estimateNote - a dollar figure on this row is estimated, not read from
//                  an invoice (kept in sync with the bill's own `estimated`
//                  boolean -- see the editor wiring in public/index.html).
//   billingNote  - a real feature of the City bill that explains the
//                  amount (rate increase, seasonal charge, meter swap,
//                  late penalty).
//   yardiNote    - a bookkeeping problem in Yardi. Does NOT change what a
//                  tenant is billed, since the bill-back runs off City
//                  invoice values.
//
// An entry can carry more than one type when a single note genuinely
// describes two facts about the same text -- but prefer separate entries
// when the facts are actually distinct (see dataPatches.js), since a
// reader filtering out one tag should never have to lose or leak part of
// a note that's *also* tagged something they want to see.
const NOTE_TYPES = ["estimateNote", "billingNote", "yardiNote"];

// Accepts either the current shape (b.noteEntries already an array) or the
// legacy flat shape (b.notes / b.estimateNote strings, from an older
// Export JSON backup or any client that hasn't been updated yet) and
// always returns a clean array of { text, types } entries. Unknown type
// strings are dropped rather than stored, so a hand-edited import can't
// silently introduce a tag the UI doesn't know how to render.
function normalizeNoteEntries(b) {
  if (Array.isArray(b.noteEntries)) {
    return b.noteEntries
      .filter((e) => e && typeof e.text === "string" && e.text.trim())
      .map((e) => ({
        text: e.text,
        types: Array.isArray(e.types) ? e.types.filter((t) => NOTE_TYPES.includes(t)) : [],
        resolved: !!e.resolved,
      }));
  }
  const entries = [];
  if (b.notes) entries.push({ text: b.notes, types: ["billingNote"], resolved: false });
  if (b.estimateNote) entries.push({ text: b.estimateNote, types: ["estimateNote"], resolved: false });
  return entries;
}

module.exports = { NOTE_TYPES, normalizeNoteEntries };
