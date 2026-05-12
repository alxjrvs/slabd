---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: 1
acs_covered: [AC-4, AC-5]
---

# Cycle-1 record — Foundation

## What was implemented

| File | Change |
|------|--------|
| `package.json` | `bun add stripe` — stripe 22.1.1 installed |
| `.env.example` | Added `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXPO_PUBLIC_APP_URL` |
| `wrangler.toml` | Documented three new secrets in production/preview comment blocks |
| `.github/workflows/ci.yml` | Added `check-stripe-config` soft-warn job mirroring `check-e2e-secret` pattern |
| `drizzle/0001_stripe_webhook_events.sql` | New migration: `stripe_webhook_events(event_id PK, received_at timestamptz)` |
| `lib/db/schema.ts` | Added `stripeWebhookEvents` Drizzle table definition |
| `lib/server/stripe/client.ts` | `getStripeClient(secretKey)` — memoized Stripe factory using `createFetchHttpClient()`, API version pinned to `2026-04-22.dahlia` |
| `lib/server/stripe/idempotency.ts` | `recordEvent(db, eventId)` — INSERT ON CONFLICT DO NOTHING, returns `{ inserted: boolean }` |
| `lib/server/stripe/onboarding-status.ts` | `SellerOnboardingStatus` union + `mapStripeAccountToStatus(account)` per ADR-0003 mapping table |
| `lib/server/middleware/require-seller-onboarded.ts` | `requireSellerOnboarded(options?)` factory; 403 unless `onboardingStatus === 'complete'` |
| `lib/server/__tests__/stripe-client.test.ts` | 5 tests: instance shape, memoization, distinct keys, fetch client, apiVersion pin |
| `lib/server/__tests__/idempotency.test.ts` | 3 tests: first insert true, duplicate false, multi-event independence |
| `lib/server/__tests__/onboarding-status-mapping.test.ts` | 9 tests: all ADR-0003 branches (pending x 2, complete x 2, restricted x 3, never not_started) |
| `lib/server/__tests__/require-seller-onboarded.test.ts` | 6 tests: no row 403, pending 403, restricted 403, complete 204, not_started 403 (defensive), factory no-throw |

## Test evidence

### AC-4 — Listing-publish gate (middleware unit-tested)

| Test name | File | What it proves |
|-----------|------|----------------|
| `requireSellerOnboarded middleware > returns 403 with onboarding_required when no seller_accounts row exists` | `require-seller-onboarded.test.ts` | Not_started (no row) blocks |
| `requireSellerOnboarded middleware > returns 403 when onboarding_status is 'pending'` | `require-seller-onboarded.test.ts` | Pending blocks |
| `requireSellerOnboarded middleware > returns 403 when onboarding_status is 'restricted'` | `require-seller-onboarded.test.ts` | Restricted blocks |
| `requireSellerOnboarded middleware > calls next() and returns 204 when onboarding_status is 'complete'` | `require-seller-onboarded.test.ts` | Complete passes through |

### AC-5 — Env, secrets, idempotency table, and tests

| Test name | File | What it proves |
|-----------|------|----------------|
| `recordEvent > returns { inserted: true } on first insert` | `idempotency.test.ts` | First delivery processed |
| `recordEvent > returns { inserted: false } on duplicate insert` | `idempotency.test.ts` | Duplicate delivery no-ops |
| `getStripeClient > pins the apiVersion to a single non-empty string` | `stripe-client.test.ts` | API version pinned |
| Schema has `stripeWebhookEvents` | `lib/db/schema.ts` + migration | Migration exists |

## Deviations from plan

1. **API version string**: ADR-0001 said pin to `"<latest GA, pin a single string>"`. The installed `stripe@22.1.1` package's `LatestApiVersion` type is `"2026-04-22.dahlia"` (not the `YYYY-MM-DD` format mentioned in the plan). Used the version the package's types require to avoid TS errors.

2. **`test:ci` pre-existing failure**: `bun run test:ci` (jest) returns "No tests found" because this worktree lives at a path containing `/.worktrees/` which matches `testPathIgnorePatterns` in `jest.config.js`. Confirmed pre-existing (stash test on parent SHA shows same failure). All 42 tests pass with `bun test lib/server/__tests__/`. Gate used: `bun run typecheck && bun run lint && bun test lib/server/__tests__/`.

3. **`bun:test` imports**: Initial test drafts used `import { describe, it } from "bun:test"` but the project's tsconfig uses `"types": ["jest", "node"]` — corrected to use Jest globals (matching existing test files).

## Commit SHA

`f5e740f` feat(stripe): foundation for Connect onboarding (cycle-1)
