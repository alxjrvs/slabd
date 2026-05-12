---
run_id: 2026-05-11-s-1-2-stripe-connect
issue: 3
schema_version: 1
source:
  kind: issue
  ref: "#3"
---

# Intent — Stripe Connect Express seller onboarding

Land the backend half of **S-1.2**: a Stripe Connect Express onboarding
flow that provisions a `seller_account` for the authenticated user,
reconciles its status via Stripe webhooks, surfaces status to the app,
and gates listing publication on a completed onboarding. Sandbox-only.
Builds atop the backend scaffold (#46): existing Hono app, hardened
Clerk JWT middleware, Drizzle/Neon DB client, and a `seller_accounts`
table already in place.

## Architecture choices

- **Stripe SDK:** the `stripe` npm package configured with a
  fetch-based HTTP client (`Stripe.createFetchHttpClient()`), so the
  same code runs under Node (Jest) and Cloudflare Workers. Webhook
  signature verification uses `stripe.webhooks.constructEventAsync`
  (async, Workers-safe — `crypto.subtle` only).
- **Account model:** Stripe Connect Express, US-only, capabilities =
  `card_payments` + `transfers`. KYC is deferred per REQ-024; the
  1099-K-threshold escalation lives in S-3.1, not here.
- **Idempotency:** a new `stripe_webhook_events(event_id PK, received_at)`
  table records every processed event ID. Re-deliveries are no-ops.
- **Listing-publish gate:** a `requireSellerOnboarded()` middleware
  reads `seller_accounts` for the current user and short-circuits with
  `403 { error: "onboarding_required" }` when `onboarding_status !==
  "complete"`. The middleware lands now on a stub `POST /api/listings`
  route returning `204` — full listing CRUD ships with S-2.4.
- **Status domain:** `seller_accounts.onboarding_status` becomes a
  four-value union `not_started | pending | complete | restricted`.
  `not_started` is synthesized when no row exists yet — the column's
  DB default `'pending'` only applies once a row exists.

## Acceptance Criteria

- **AC-1 — Stripe Connect Account + Account Link creation.**
  `POST /api/onboarding/start` is Clerk-gated. For the authenticated
  user, it ensures a Stripe Connect Express Account exists (creating
  one if `seller_accounts.stripe_account_id` is null and persisting
  the resulting id), then creates an Account Link
  (`type: account_onboarding`, `return_url` + `refresh_url` derived
  from `EXPO_PUBLIC_APP_URL`) and returns `{ url, expiresAt }`.

- **AC-2 — Stripe webhook reconciles onboarding state.**
  `POST /api/webhooks/stripe` verifies the `Stripe-Signature` header
  against `STRIPE_WEBHOOK_SECRET`. On `account.updated`, the handler
  resolves the matching `seller_accounts` row by `stripe_account_id`
  and updates `onboarding_status` (`pending | complete | restricted`)
  and `payouts_enabled` from the Stripe Account payload. Each
  `event.id` is recorded in `stripe_webhook_events`; duplicate
  deliveries return `200` without re-applying. Invalid signatures
  return `400`. Unknown event types return `200` with no effect.

- **AC-3 — Onboarding-status read endpoint.**
  `GET /api/onboarding/status` is Clerk-gated and returns
  `{ onboardingStatus, payoutsEnabled }` for the current user.
  `onboardingStatus` is one of `not_started | pending | complete |
  restricted`. `not_started` is returned when no `seller_accounts`
  row exists; `payoutsEnabled` is `false` in that case.

- **AC-4 — Listing-publish gate.**
  A reusable `requireSellerOnboarded()` Hono middleware reads
  `seller_accounts` for `c.var.userId` and returns
  `403 { error: "onboarding_required" }` when the status is not
  `complete`. It is wired on a stub `POST /api/listings` route that
  otherwise returns `204`. Integration tests exercise both branches
  (gate blocks pending, gate passes once status flips to complete).

- **AC-5 — Env, secrets, idempotency table, and tests.**
  New env vars `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `EXPO_PUBLIC_APP_URL` are declared in `.env.example`, `wrangler.toml`,
  and `.github/workflows/ci.yml` (soft-warn step). A Drizzle migration
  adds `stripe_webhook_events`. Jest covers: start (account create vs
  reuse + link returned), webhook (signature valid + idempotent + bad
  signature + unknown event), status (all four states), and gate
  (block + pass). `bun run typecheck && bun run lint && bun run
  test:ci` is green.

## Out of scope

- KYC escalation at the 1099-K threshold (lands in S-3.1).
- Verified-seller badge surfacing (REQ-009 — separate listing-side
  story).
- Frontend onboarding UI screens (a separate app-side story).
- Listing CRUD beyond the stub `POST /api/listings` (lands in S-2.4).
- Stripe Login Links / Express dashboard access.
- Production Stripe webhook configuration — sandbox env only here.
- Payouts cadence configuration (weekly default assumed per
  PRD audit; configuration deferred).
- Tax / Stripe Tax integration (lands in S-3.2).
- Multi-currency support (US-only v1).

## REQ coverage

REQ-006 (foundation: escrow processor wiring), REQ-008 (dual
buyer/seller mode — a buyer becomes a seller by completing
onboarding), REQ-009 (foundation: onboarding state surfaces in
profile), REQ-030 (Stripe Connect Express, full integration).

## Proposed ontology terms

- `stripe_account_link` — short-lived Stripe-hosted onboarding URL
  returned by `POST /api/onboarding/start`.
- `stripe_webhook_event` — persisted webhook event ID used for
  idempotency.
- `seller_onboarding_status` — domain state machine value
  (`not_started | pending | complete | restricted`).
- `seller_publish_gate` — middleware that gates listing-write actions
  on a `complete` onboarding status.

## Notes

This is the first authenticated-write surface in the API — the two
follow-ups from the scaffold review (hardened JWT verify + JWKS
refetch rate-limit, both shipped in #47) were intentionally landed
before this story for that reason. The webhook endpoint is the first
*unauthenticated* write endpoint (gated only by Stripe signature
verification); take care to keep its surface narrow.
