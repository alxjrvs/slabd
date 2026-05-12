---
run_id: 2026-05-11-backend-scaffold-baseline
issue: 43
schema_version: 1
---

# Intent — Backend scaffold baseline

Stand up the minimum backend surface required to unblock **S-1.2** (Stripe
Connect Express, #3), **S-1.3** (image upload pipeline, #4), and **S-1.4**
(GCD catalog, #6). Today the repo is Expo-only; those stories all require
an authenticated API + DB. This story creates that API surface using the
lowest-friction path that still lines up with the architecture's
Postgres/Drizzle/Clerk choices.

## Architecture choices

- **Runtime:** Expo Router API routes (`+api.ts`), bundled by the existing
  web build and deployed to **Cloudflare Pages** via the workflow that
  already produces preview URLs. Mobile clients fetch from the same deploy
  via `EXPO_PUBLIC_API_BASE_URL`. Local dev: metro serves API routes
  inline at `http://localhost:8081/api/*`.
- **Framework:** Hono (cross-runtime, supports Workers + Node + Bun)
  layered behind Expo Router's request handler.
- **Database:** Neon Postgres via `@neondatabase/serverless` HTTP driver
  (Workers-compatible). Drizzle ORM + Zod schemas.
- **Auth:** Clerk JWT verification using Clerk's networkless verification
  (the public key is fetched once and cached).
- **Migrations:** Drizzle Kit with a committed migration history.

The architecture's eventual Fly.io + BullMQ setup is deferred — when
payment-state-machine workers or async jobs are needed, we migrate that
subset to Fly.io behind the same Hono API.

## Acceptance Criteria

- **AC-1 — Hono on Expo Router with Clerk JWT middleware.** API routes
  mount under `app/api/` and route through a single Hono app. A
  `clerkAuth()` middleware extracts the bearer token, verifies it against
  Clerk's JWKS, and sets `c.var.userId`. Routes can opt-in via
  `app.use("*", clerkAuth())` or per-route.

- **AC-2 — Drizzle + Neon Postgres connection.** A `db` client is
  exported from `lib/db/` using `@neondatabase/serverless`. Initial schema
  declared with Drizzle: `users` (mirrors Clerk id + email) and
  `seller_accounts` (placeholder columns: `user_id`, `stripe_account_id`,
  `onboarding_status`, `payouts_enabled`). `drizzle-kit generate` + a
  committed initial migration.

- **AC-3 — /api/healthz + /api/me endpoints.** `GET /api/healthz` returns
  `{ status: "ok", db: "ok" | "down" }`. `GET /api/me` is Clerk-gated and
  returns `{ userId, email }` from the JWT claims (DB lookup deferred —
  proves both transport + auth work).

- **AC-4 — Cloudflare Pages deployment wired with env.** Existing
  Cloudflare workflow extended so the deploy bundle includes API routes.
  Required env vars (`DATABASE_URL`, `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`) declared in `wrangler.toml` + GitHub Actions
  secrets. `.env.example` updated with all new keys.

- **AC-5 — Local dev workflow + tests.** `bun run dev:api` (or a combined
  `bun run dev`) serves API routes at `http://localhost:8081/api/*`.
  Jest covers the Clerk middleware (verifies + rejects, uses a mocked
  JWKS) and the healthz/me handlers. README updated with the local-dev
  story for the API.

## Out of scope

- Stripe Connect endpoints (lands in S-1.2)
- Image upload / signed URL endpoints (lands in S-1.3)
- GCD catalog endpoints (lands in S-1.4)
- BullMQ / Upstash workers — defer until payment state machine needs
  async jobs
- Fly.io migration — defer until Workers cold-start or throughput becomes
  an issue
- API correlation-ID middleware (already noted as deferred in S-1.5
  scope; remains deferred until a real cross-service need lands)
- Admin-role JWT claims (the seller-vs-buyer + admin role surface lands
  with whoever first needs to gate by role)

## REQ coverage

REQ-006 (foundation only), REQ-008, REQ-013, REQ-029 (extends), REQ-033.

## Proposed ontology terms

- `seller_account` — DB-side representation of a Stripe Connect account
  binding (distinct from the eventual `seller_profile` UI concept).
- `clerk_auth_middleware` — Hono middleware that verifies Clerk JWTs and
  hydrates `c.var.userId`.
- `api_route_handler` — Expo Router `+api.ts` file that delegates to Hono.

## Notes

This story is a foundation for the rest of M1. It does not deliver any
user-visible feature on its own.
