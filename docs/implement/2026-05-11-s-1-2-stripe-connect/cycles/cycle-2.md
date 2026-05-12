---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: 2
acs_covered: [AC-1]
---

# Cycle 2 — Onboarding start endpoint (AC-1)

## Summary

Implements `POST /api/onboarding/start` as an exported handler factory
`onboardingStartHandler(deps)`. The handler is Clerk-gated (reads
`c.var.userId` set by upstream `clerkAuth()` middleware).

## Files written

- `lib/server/routes/onboarding-start.ts` — handler factory
- `lib/server/__tests__/onboarding-start.test.ts` — 5 passing tests

## Handler behavior

1. Queries `seller_accounts` by `userId` via injected `db`.
2. If no row exists or `stripe_account_id` is null:
   - Creates a Stripe Connect Express account (`type: "express"`, `country: "US"`, capabilities `card_payments` + `transfers`).
   - Upserts `seller_accounts` row with `onboarding_status = "pending"` and `payouts_enabled = false`. FK violation returns 500 (no auto-create of users row).
3. Calls `stripe.accountLinks.create` with `type: "account_onboarding"`, `return_url`, and `refresh_url` derived from `EXPO_PUBLIC_APP_URL`.
4. Returns `200 { url, expiresAt }` (expiresAt from `expires_at` unix seconds).

## Test coverage

| Test | Branch |
|------|--------|
| Creates new Stripe account when none exists | No row path: accounts.create called, row upserted, 200 returned |
| Reuses existing stripe_account_id | Existing row path: accounts.create NOT called, accountLinks.create called with existing id |
| Account Link wires return_url + refresh_url | URL derivation from EXPO_PUBLIC_APP_URL |
| Stripe SDK error propagates (accountLinks) | accountLinks.create throws → 500 |
| Stripe SDK error propagates (accounts.create) | accounts.create throws → 500 |

## Options-injection pattern

Matches `clerkAuth()` and `requireSellerOnboarded()`. Accepts `{ db, stripe, env }` deps — all optional, defaulting to live singletons at handler-time. Type-safe via `OnboardingStartDeps` interface (exported).

## Verification

```
bun run typecheck  # clean
bun run lint       # clean
bun test lib/server/__tests__/onboarding-start.test.ts  # 5 pass, 0 fail
```
