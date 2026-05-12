---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: 5
acs_covered: [AC-1, AC-2, AC-3, AC-4]
---

# Cycle 5 — App wiring + end-to-end integration test

## Summary

Wired the four new routes into `lib/server/app.ts` via an extended
`CreateAppOptions` interface and delivered a two-test integration suite
that chains AC-1 through AC-4 against a shared in-memory mock DB.

## Changes

### lib/server/app.ts

Extended `createApp()` with `CreateAppOptions` (extends `ClerkAuthOptions`)
carrying four injectable dep bundles:

- `onboardingStartDeps`
- `onboardingStatusDeps`
- `stripeWebhookDeps`
- `requireSellerOnboardedOptions`

Mount order:

```
GET  /api/healthz          — no auth
GET  /api/me               — clerkAuth
POST /api/onboarding/start — clerkAuth → onboardingStartHandler
GET  /api/onboarding/status — clerkAuth → onboardingStatusHandler
POST /api/webhooks/stripe  — stripeWebhookHandler (no clerkAuth)
POST /api/listings         — clerkAuth → requireSellerOnboarded → listingsStubHandler
```

Hono's `app.use` + `app.<verb>` separation is preserved throughout.

### lib/server/__tests__/stripe-connect.integration.test.ts

Two `it()` tests:

1. **AC-1→AC-4 chain** — uses a shared `buildInMemoryDb()` helper that
   manages a `Map<userId, SellerRow>` and a `Set<eventId>` for idempotency.
   Drizzle `eq()` conditions are parsed without `JSON.stringify` by reading
   `queryChunks[1].name` (column DB name) and `queryChunks[3].value` (bound
   param) directly. `stripeWebhookEvents` vs `sellerAccounts` table dispatch
   is detected via `"eventId" in table`. The mock Stripe uses real
   `webhooks.constructEventAsync` with a Node `crypto.createHmac` signer
   (Bun-safe, mirrors cycle-3).

2. **AC-3 not_started** — fresh empty DB; verifies synthesized `not_started`
   when no `seller_accounts` row exists.

## Decisions

- `as any` casts for the mock DB at injection sites — acceptable because the
  mock satisfies the structural contract of each handler's `SelectableDb`
  type; the test is not type-safe across all four interfaces simultaneously.
- Drizzle AST introspection (`queryChunks` index access) is deliberately
  fragile: if Drizzle's internal node layout changes the tests will break
  loudly rather than silently. This is a test-file concern, not production.

## Verification

```
bun run typecheck  — pass (0 errors)
bun run lint       — pass (0 errors, 0 warnings)
bun test lib/server/__tests__/stripe-connect.integration.test.ts — 2/2 pass
bun test lib/server/__tests__/                                    — 61/61 pass
```
