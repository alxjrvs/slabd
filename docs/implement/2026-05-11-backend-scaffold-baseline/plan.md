# Plan — Backend scaffold baseline

**Run:** `2026-05-11-backend-scaffold-baseline`
**Issue:** #43
**ACs:** AC-1..AC-5 (see `intent.md`)
**Budget:** 12 (planned: 4 cycles)
**Mode:** concurrent
**PR strategy:** one

## Dep graph

```
cycle-1 ──┐
          ├── cycle-3 ── cycle-4
cycle-2 ──┘
```

- `cycle-1` and `cycle-2` are independent. Run in parallel worktrees.
- `cycle-3` depends on both (consumes Hono/middleware from cycle-1 and DB
  client from cycle-2).
- `cycle-4` depends on `cycle-3` (deploy wiring needs the routes that
  cycle-3 produces).

## Cycle decomposition

### cycle-1 — Hono + Clerk auth middleware

**Covers:** AC-1 (+ part of AC-5: middleware tests)
**ACs:** [AC-1]
**Reads from:** none (clean slate)

**Files to create:**

- `lib/server/app.ts` — Hono app factory. Exports `createApp()` that
  returns a configured Hono instance. Centralizes middleware order.
- `lib/server/middleware/clerk-auth.ts` — `clerkAuth()` middleware.
  Verifies bearer token against Clerk JWKS (cached after first fetch),
  sets `c.var.userId` and `c.var.email`. Returns 401 on missing/invalid.
- `lib/server/types.ts` — Hono `Variables` type (`{ userId: string;
  email: string }`) so handlers get typed `c.var`.
- `lib/server/__tests__/clerk-auth.test.ts` — Jest tests: verifies valid
  token, rejects missing header, rejects malformed JWT, rejects expired,
  rejects wrong-issuer. Uses a mocked JWKS (in-memory JWK set + signed
  test fixtures via `jose`).

**Files to modify:**

- `package.json` — add deps: `hono@^4`, `@clerk/backend@^1` (provides the
  JWT verifier), `jose@^5` (only as devDep for tests).

**Out of scope:** API route file (`app/api/[...].ts`) lands in cycle-3
because the route file's only job is to instantiate the Hono app and
delegate — that wiring belongs with the first real handlers.

### cycle-2 — Drizzle + Neon DB layer

**Covers:** AC-2
**ACs:** [AC-2]
**Reads from:** none (clean slate)

**Files to create:**

- `lib/db/client.ts` — `db` singleton from `drizzle-orm/neon-http`
  configured with `neon(DATABASE_URL)`. Throws on missing env in non-test.
- `lib/db/schema.ts` — Drizzle schema:
  - `users` (id text PK = clerk id, email text NOT NULL, created_at,
    updated_at)
  - `seller_accounts` (user_id text PK = FK→users.id, stripe_account_id
    text NULL, onboarding_status text NOT NULL DEFAULT 'pending',
    payouts_enabled boolean NOT NULL DEFAULT false, created_at,
    updated_at)
- `lib/db/index.ts` — re-exports `db` + schema namespace for callers.
- `drizzle.config.ts` — drizzle-kit config (schema path, out dir, dialect
  `postgresql`, driver `neon-http`).
- `drizzle/0000_init.sql` — generated migration committed to repo.
- `drizzle/meta/_journal.json` — drizzle-kit journal.
- `lib/db/__tests__/schema.test.ts` — tiny type-level sanity test
  (`expectTypeOf`) that the schema matches expected columns. No runtime
  Postgres dep in test.

**Files to modify:**

- `package.json` — add deps: `drizzle-orm@^0.36`, `@neondatabase/serverless@^0.10`;
  devDeps: `drizzle-kit@^0.28`.

**Migration policy:** `drizzle-kit generate` produces the SQL; we commit
it. Running migrations in CI / deploy is **out of scope** for this story
— captured as follow-up (S-1.x migrations runner).

### cycle-3 — /api/healthz + /api/me endpoints

**Covers:** AC-3 (+ part of AC-5: handler tests)
**ACs:** [AC-3, AC-5]
**Reads from:** cycle-1 (`lib/server/app.ts`, `clerkAuth`), cycle-2
(`lib/db/client.ts`)

**Files to create:**

- `app/api/[...path]+api.ts` — Expo Router API catch-all. Imports
  `createApp()` and delegates: `export async function GET(request) {
  return createApp().fetch(request); }` (and similarly for POST/PUT/
  DELETE if Hono needs them — initially GET-only is enough).
- `lib/server/routes/healthz.ts` — handler. Returns `{ status: "ok",
  db: "ok" | "down" }`. DB probe runs `SELECT 1` with a 1s timeout.
- `lib/server/routes/me.ts` — handler. Gated by `clerkAuth()`. Returns
  `{ userId, email }` from `c.var` (no DB lookup — AC-3 explicitly
  defers DB hydration).
- `lib/server/__tests__/healthz.test.ts` — tests: returns `db: "ok"`
  when probe resolves, `db: "down"` when probe rejects.
- `lib/server/__tests__/me.test.ts` — tests: 401 without bearer,
  200 + `{ userId, email }` with valid token (uses the same mocked JWKS
  helper from cycle-1).

**Files to modify:**

- `lib/server/app.ts` — wire routes:
  `app.get("/api/healthz", healthzHandler)`,
  `app.use("/api/me", clerkAuth())`, `app.get("/api/me", meHandler)`.

**Wiring note:** Expo Router's API route convention is `+api.ts`. The
catch-all `[...path]+api.ts` lets Hono own the entire `/api/*` subtree
without listing every endpoint as a separate file.

### cycle-4 — Cloudflare Pages deploy + dev wiring + README

**Covers:** AC-4 + AC-5 remainder (dev script + README)
**ACs:** [AC-4, AC-5]
**Reads from:** cycle-3 (routes exist)

**Files to create:**

- `wrangler.toml` (if absent) — Pages-compatible config; declare env
  bindings for `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
  (production + preview env blocks).

**Files to modify:**

- `.github/workflows/<cloudflare-deploy>.yml` — confirm the build step
  outputs API bundle (Expo Router static export already includes
  `+api.ts` routes when `EXPO_USE_STATIC=server` or equivalent is set).
  Pass secrets from GitHub Actions secrets → Cloudflare env.
- `.env.example` — append `DATABASE_URL`, `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL`.
- `package.json` — add `scripts.dev:api` that runs Expo dev server with
  API routes enabled (`expo start --web --port 8081` is sufficient since
  Expo Router serves API routes inline).
- `README.md` — add a "Local API dev" section explaining `bun run dev`
  → `http://localhost:8081/api/healthz`.

**Verification on this cycle:** local curl against
`http://localhost:8081/api/healthz` returns `{ status: "ok", db: ... }`.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Expo Router API routes don't bundle correctly on Cloudflare Pages | Cycle-4 has a manual smoke test step in the cycle envelope: `gh deploy preview` then `curl /api/healthz`. If the bundle doesn't include routes, fall back to a separate Worker (still Hono — code stays portable). |
| `@clerk/backend` Workers compatibility | Clerk's `verifyToken` from `@clerk/backend` is documented as Workers-compatible. Confirmed via context7. Tests use mocked JWKS so no live Clerk dep at test time. |
| Migration runner deferred but env reads `DATABASE_URL` in dev | `lib/db/client.ts` reads env lazily; `/api/healthz` probe degrades gracefully to `db: "down"` if connection fails. README documents that the dev Neon branch must exist before `db: "ok"` returns. |

## Out of scope (deferred to follow-ups)

- Migration runner in CI / deploy
- Stripe Connect endpoints (S-1.2)
- Image upload / signed-URL endpoints (S-1.3)
- GCD catalog endpoints (S-1.4)
- BullMQ / Upstash workers
- Fly.io migration (when async jobs land)
- Correlation-ID middleware
- Admin-role JWT claims
