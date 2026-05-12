# Sleeve

**"An Infinite Longbox"** — a mobile-first, Tinder-style swipe marketplace for rare comics.

Sellers list back-issue and collectible comics; buyers discover them by swiping through filterable, curated and open-marketplace decks. v1 targets US-only fixed-price transactions delivered via Expo (iOS, Android, Web).

## Planning Docs

- [`ideate/PRD.md`](ideate/PRD.md) — Product Requirements (37 REQ-IDs, MoSCoW prioritized)
- [`ideate/architecture.md`](ideate/architecture.md) — Arc42 architecture (sections 1–12 + appendices)
- [`docs/superpowers/specs/`](docs/superpowers/specs) — Brand language and app-name design specs

## Milestones

| Milestone | Weeks | Focus |
|---|---|---|
| M1 Foundation | 1–12 | App shell, backend baseline, integrations POC |
| M2 Marketplace Core | 13–30 | Discovery, listings, commerce, fulfillment |
| M3 Compliance & Launch | 31–42 | KYC, tax, disputes, beta, store submission |

## Status

Greenfield — planning complete, implementation pending.

## Development

### Local API dev

The API runs inline with the Expo dev server. No separate process needed.

**1. Set up env**

```sh
cp .env.example .env
```

Edit `.env` and fill in at minimum:

- `DATABASE_URL` — Neon Postgres connection string (provision a branch at https://console.neon.tech)
- `CLERK_SECRET_KEY` — Clerk backend secret key (from https://dashboard.clerk.com → API Keys)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (same value as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`)

**2. Start the dev server**

```sh
bun run dev:api
```

This runs `expo start --web --port 8081`. Expo Router serves `+api.ts` routes inline at `http://localhost:8081/api/*`.

**3. Smoke test**

```sh
curl http://localhost:8081/api/healthz
```

Expected response:

```json
{ "status": "ok", "db": "ok" }
```

If `DATABASE_URL` is unset or the connection fails, `db` will be `"down"` — the server still starts.

**4. Database setup (to get `db: "ok"`)**

- Provision a Neon branch at https://console.neon.tech and copy the connection string into `DATABASE_URL` in `.env`.
- Generate migrations if the schema has changed (no-op if unchanged):
  ```sh
  bunx drizzle-kit generate
  ```
- Apply pending migrations against your Neon branch:
  ```sh
  bunx drizzle-kit migrate
  ```
  Note: this is a manual step until the CI migration runner lands in a later story.
