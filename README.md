# ARLI API

Express + Postgres. **There is no build step** — it is plain CommonJS, so
`npm start` runs `index.js` directly. What it needs is a deploy.

## Before you deploy — rotate the database password

`db.js` once carried the Supabase password as a hardcoded fallback, and that
commit is still in git history on GitHub. The code no longer contains it, but
**the credential itself is still valid until you rotate it**:

> Supabase dashboard → Project Settings → Database → Reset database password

Deploying with the exposed credential publishes a service that anyone reading
your git history can reach the database of. Rotate first.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Supabase → Settings → Database → Connection string → URI. Boot fails without it. |
| `CORS_ORIGINS` | strongly advised | Comma-separated origins allowed to call the API. Without it the API accepts **any** origin and logs a `[SECURITY]` warning on boot. |
| `PORT` | no | Defaults to 5000. Most hosts set this for you. |
| `HOST` | no | Defaults to `0.0.0.0`, which containers need. |
| `NODE_ENV` | no | `production` turns on the CORS allowlist and the seed guard. |

Copy `.env.example` to `.env` for local work.

## Run locally

```bash
npm install
npm start
```

Seed a development database (drops and recreates all three tables):

```bash
npm run seed
```

## Deploy

The API imports nothing from `packages/*`, so it builds standalone. **Set the
root directory to `apps/api`**, not the repo root.

**Render** — the included `render.yaml` is a blueprint; point Render at the repo
and set `DATABASE_URL` and `CORS_ORIGINS` in the dashboard.

**Any container host** (Railway, Fly, Cloud Run, a VPS):

```bash
docker build -t arli-api apps/api
docker run -p 5000:5000 -e DATABASE_URL=... -e CORS_ORIGINS=... -e NODE_ENV=production arli-api
```

**Node host with no containers** — set the root directory to `apps/api`, build
command `npm install`, start command `npm start`.

Health check path: `/api/health`. It queries the database, so a 200 means the
API *and* its connection are up.

## Three guards, and why

**A missing `CORS_ORIGINS` in production logs a `[SECURITY]` warning.** An open
CORS policy lets any site on the internet call this API with a user's
credentials. The API still starts, because refusing to boot would take a running
service down over a config gap — and open CORS is what it already did, so
starting is no worse than the status quo. Set `CORS_ORIGINS` to close it.

**`init_db.js` refuses to run when `NODE_ENV=production`.** It `TRUNCATE`s
users, listings and orders. Override with `--yes-wipe-production` only if you
mean it.

**Boot fails on a missing `DATABASE_URL`** rather than falling back to anything.

## Known gaps

These are tracked in `docs/ARLI-Feature-Inventory.xlsx`:

- **No request validation.** Zod schemas exist in `@arli/contracts` but the API
  does not use them yet, so `POST` bodies are trusted.
- **No migrations.** `init_db.js` recreates from scratch; there is no path that
  preserves data.
- **No auth on any endpoint.** `GET /api/orders` returns every order to anyone,
  unscoped by merchant.
- **`/api/auth/demo-login` returns the raw database row**, snake_case, unlike
  every other endpoint. `@arli/api-client` adapts it; delete that adapter when
  the API is fixed.
- **`ssl: { rejectUnauthorized: false }`** in `db.js` accepts any certificate.

Do not treat this as production-ready for real customer data until at least
auth and validation are in place.
