---
run_id: 2026-05-11-s-1-2-stripe-connect
phase: phase_0_plan
schema_version: 1
---

# Plan — Stripe Connect Express seller onboarding

Decomposition of `intent.md` into ≤8 cycles. File paths are
pairwise disjoint across cycles so concurrent worktree dispatch is
safe. Wiring into `lib/server/app.ts` is concentrated in the final
integration cycle to keep the disjoint constraint clean.

## Cycle decomposition

### cycle-1 — Foundation (env, schema, Stripe client, idempotency, gate middleware)

**ACs covered:** AC-4 (middleware unit), AC-5 (env + migration)

**file_paths:**
- `.env.example`
- `wrangler.toml`
- `.github/workflows/ci.yml`
- `drizzle/0001_stripe_webhook_events.sql`
- `lib/server/db/schema.ts`
- `lib/server/stripe/client.ts`
- `lib/server/stripe/idempotency.ts`
- `lib/server/middleware/require-seller-onboarded.ts`
- `lib/server/__tests__/stripe-client.test.ts`
- `lib/server/__tests__/idempotency.test.ts`
- `lib/server/__tests__/require-seller-onboarded.test.ts`

**reads_from:** []

**mode:** default

**Notes:** Adds `stripe_webhook_events(event_id PK, received_at)` table
to `schema.ts` plus migration. Stripe client uses
`Stripe.createFetchHttpClient()` for Workers compatibility. Idempotency
helper exposes `recordEvent(eventId)` returning `{ inserted: bool }` via
INSERT … ON CONFLICT DO NOTHING. `requireSellerOnboarded()` is a
factory returning a Hono middleware that reads
`seller_accounts.onboarding_status` for `c.var.userId`. Env declared in
`.env.example`, `wrangler.toml`, and a soft-warn step in CI.

### cycle-2 — Onboarding start endpoint (AC-1)

**ACs covered:** AC-1

**file_paths:**
- `lib/server/routes/onboarding-start.ts`
- `lib/server/__tests__/onboarding-start.test.ts`

**reads_from:**
- `lib/server/stripe/client.ts`
- `lib/server/db/schema.ts`
- `lib/server/middleware/clerk-auth.ts`

**mode:** default

**Notes:** Clerk-gated handler. Looks up `seller_accounts` row by
`userId`. If `stripe_account_id` is null, calls `stripe.accounts.create`
with `type: "express"`, `country: "US"`, `capabilities: { card_payments,
transfers }` and persists the id. Then `stripe.accountLinks.create` with
`type: "account_onboarding"`, `return_url` and `refresh_url` derived
from `EXPO_PUBLIC_APP_URL`. Returns `{ url, expiresAt }`. Tests cover
the create-vs-reuse branch.

### cycle-3 — Stripe webhook handler (AC-2)

**ACs covered:** AC-2

**file_paths:**
- `lib/server/routes/stripe-webhook.ts`
- `lib/server/__tests__/stripe-webhook.test.ts`

**reads_from:**
- `lib/server/stripe/client.ts`
- `lib/server/stripe/idempotency.ts`
- `lib/server/db/schema.ts`

**mode:** default

**Notes:** Verifies `Stripe-Signature` via
`stripe.webhooks.constructEventAsync` (Workers-safe). On
`account.updated`, looks up the matching `seller_accounts` row by
`stripe_account_id` and updates `onboarding_status` (computed from
`charges_enabled` + `details_submitted` + `requirements.disabled_reason`)
plus `payouts_enabled`. Each `event.id` is recorded in
`stripe_webhook_events`; duplicates short-circuit to `200`. Invalid
signature → `400`. Unknown event types → `200` no-effect. Test cases:
valid + idempotent + bad-sig + unknown-event.

### cycle-4 — Status read + listings stub gated (AC-3, AC-4)

**ACs covered:** AC-3, AC-4

**file_paths:**
- `lib/server/routes/onboarding-status.ts`
- `lib/server/routes/listings-stub.ts`
- `lib/server/__tests__/onboarding-status.test.ts`
- `lib/server/__tests__/listings-gate.test.ts`

**reads_from:**
- `lib/server/db/schema.ts`
- `lib/server/middleware/clerk-auth.ts`
- `lib/server/middleware/require-seller-onboarded.ts`

**mode:** default

**Notes:** Status handler returns `{ onboardingStatus, payoutsEnabled }`;
synthesizes `not_started` when no `seller_accounts` row exists. Listings
stub is `POST /api/listings` returning `204`, mounted behind
`requireSellerOnboarded()`. Gate test exercises both branches by
flipping `onboarding_status` from `pending` → `complete` for the same
fixture user.

### cycle-5 — App wiring + end-to-end integration test

**ACs covered:** AC-1, AC-2, AC-3, AC-4 (integration-level)

**file_paths:**
- `lib/server/app.ts`
- `lib/server/__tests__/stripe-connect.integration.test.ts`

**reads_from:**
- `lib/server/routes/onboarding-start.ts`
- `lib/server/routes/onboarding-status.ts`
- `lib/server/routes/stripe-webhook.ts`
- `lib/server/routes/listings-stub.ts`
- `lib/server/middleware/clerk-auth.ts`
- `lib/server/middleware/require-seller-onboarded.ts`

**mode:** verify

**Notes:** Sole writer to `lib/server/app.ts`. Mounts the four new
routes with appropriate middleware: `clerkAuth` on `start`, `status`,
and `listings`; `requireSellerOnboarded()` chained on `listings`; no
middleware on `webhooks/stripe` (signature verification inside the
handler is the gate). Integration test composes the full chain: bootstrap
account → simulate `account.updated` webhook → verify status flips →
verify listing publish now succeeds. Acts as the corroboration cycle.

## Dependency graph

```
cycle-1: []
cycle-2: [cycle-1]
cycle-3: [cycle-1]
cycle-4: [cycle-1]
cycle-5: [cycle-2, cycle-3, cycle-4]
```

Cycles 2/3/4 can run concurrently after cycle-1. Cycle-5 is the
integration point.

## AC coverage check

| AC | Cycles |
|----|--------|
| AC-1 | cycle-2, cycle-5 |
| AC-2 | cycle-3, cycle-5 |
| AC-3 | cycle-4, cycle-5 |
| AC-4 | cycle-1 (middleware), cycle-4 (gate behavior), cycle-5 (integration) |
| AC-5 | cycle-1 (env + migration), all cycles (tests) |

Every AC is covered by ≥1 cycle. file_paths are pairwise disjoint.

## ADRs (Phase 0 scaffold)

Proposed (≤5):

1. **0001-stripe-sdk-fetch-client.md** — Why the `stripe` npm package
   with `createFetchHttpClient()` rather than raw `fetch` REST calls or
   `stripe-deno`. Captures the Node/Jest + Cloudflare Workers parity
   requirement and the `constructEventAsync` choice for signature
   verification.
2. **0002-webhook-idempotency-table.md** — Why a dedicated
   `stripe_webhook_events` table (vs. column on `seller_accounts` or
   in-memory cache). Records the at-least-once-delivery contract from
   Stripe and the chosen INSERT … ON CONFLICT DO NOTHING pattern.
3. **0003-seller-onboarding-status-model.md** — Four-state union
   (`not_started | pending | complete | restricted`) and the rule that
   `not_started` is synthesized at the API layer when no row exists.
   Documents the mapping from Stripe Account payload fields to status.
4. **0004-publish-gate-middleware.md** — Why `requireSellerOnboarded()`
   is a Hono middleware factory (vs. inline check). Establishes the
   pattern for future write gates and explains the
   `403 { error: "onboarding_required" }` response shape.

README-context.md will summarize the Stripe Connect surface for future
contributors: file map, env var inventory, sandbox vs. production
boundaries, and pointers to the four ADRs.
