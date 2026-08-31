# Harbor Freight Center billing tool

Water & Fire Monitoring bill-back tool for Harbor Freight Center, gated behind a
shared passcode. Data lives in Neon Postgres and is read/written through the
serverless functions in `/api`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PASSCODE` | Shared passcode for the login gate (see `lib/auth.js`). |
| `DATABASE_URL` / `POSTGRES_URL` | Postgres connection string. When a Neon Postgres integration is attached to the Vercel project, these are added automatically — no manual configuration needed. |

None of these are hard-coded anywhere in the app; both `server.js` and every
function under `/api` read them from `process.env` at request time.

## Database

The tables are three: `tenants`, `bills`, `readings` (schema in
`lib/schema.js`) — uniform, clearly-relational data gets normal typed
columns; the genuinely variable nested bits (a bill's water/FM line items, a
tenant's per-suite usage, a reading's per-tenant gallons) live in `JSONB`
columns so no field gets lost to a rigid schema.

**Self-healing, on purpose:** the site does not depend on anyone running a
migration by hand. Every database access (`lib/db.js`) first calls
`lib/ensureSchema.js`, which:

1. Runs the (idempotent) `CREATE TABLE IF NOT EXISTS` statements.
2. For each table that is *completely empty*, loads it from
   `db/seed-data.json` (the data that used to be hard-coded as
   `SEED_TENANTS` / `SEED_BILLS` / `SEED_READINGS` in `public/index.html`).
3. Never touches a table that already has even one row — so once real data
   exists, this can't overwrite it, no matter how many times it runs.

A Postgres advisory lock serializes this across concurrent cold starts, and
the check is cached per warm serverless instance so it's a no-op after the
first request. In short: point a brand-new, empty Neon database at this
project and the very first page load sets everything up automatically.

**Data patches:** because seeding only ever touches a completely empty
table, editing `db/seed-data.json` has no effect once the site has real
rows — which it does, almost immediately. When a fact about existing data
changes after go-live (e.g. a meter's identity gets confirmed) and the live
rows need an actual correction, add an entry to `lib/dataPatches.js`
instead. `lib/ensureSchema.js` runs each one at most once per database
(tracked in the `schema_patches` table) the next time the site is used
after deploying it — no manual migration step, same as everything else
here.

For manual/local use, two standalone scripts run that same logic directly
(both safe to re-run — they only ever create-if-missing / seed-if-empty,
never overwrite):

```bash
DATABASE_URL="postgres://..." npm run db:migrate   # tables only, no seed data
DATABASE_URL="postgres://..." npm run db:seed      # tables + seed if empty
```

## API

All endpoints require the same session cookie the rest of the site uses (they
return `401` otherwise):

- `GET /api/tenants`, `POST /api/tenants`
- `PUT /api/tenant?id=<id>`, `DELETE /api/tenant?id=<id>`
- `GET /api/bills`, `POST /api/bills`
- `PUT /api/bill?id=<id>`, `DELETE /api/bill?id=<id>`
- `GET /api/readings`, `POST /api/readings`
- `PUT /api/reading?date=<YYYY-MM-DD>` (merges the given readings into the
  existing entry), `DELETE /api/reading?date=<YYYY-MM-DD>`
- `POST /api/import` — wholesale replace of all three tables, used by the
  "Import JSON" backup-restore button in the UI.

## Local development

```bash
npm install
PASSCODE=devpasscode DATABASE_URL="postgres://..." npm start
```

`server.js` alone only serves the login-gated static site — the `/api/*`
functions need Vercel's routing (see `vercel.json`) to be reachable, so for a
full local run use `vercel dev` instead of `npm start`.
