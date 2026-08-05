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

- `db/schema.sql` — the three tables the app uses: `tenants`, `bills`, `readings`.
- `db/seed-data.json` — the data that used to be hard-coded as `SEED_TENANTS` /
  `SEED_BILLS` / `SEED_READINGS` in `public/index.html`.
- `db/seed.js` — creates the tables (if missing) and loads them with
  `seed-data.json`. Safe to re-run: it upserts by primary key.

To (re-)provision a database:

```bash
DATABASE_URL="postgres://..." npm run db:seed
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
