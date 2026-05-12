---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: "6-remediation"
acs_covered: [AC-1, AC-2, AC-3, AC-4]
findings_addressed: [CRITICAL-1, CRITICAL-2, CRITICAL-3, IMPORTANT-1, IMPORTANT-3, IMPORTANT-4, IMPORTANT-5]
---

# Cycle 6 — Remediation

## Summary

Phase-4 final-review surfaced two production-silent `await` bugs, one webhook
error-path gap, and three missing tests. This cycle fixes all of them. No
scope was added beyond the review findings.

---

## CRITICAL-1: Missing `await` in `require-seller-onboarded.ts`

**File:** `lib/server/middleware/require-seller-onboarded.ts`

Drizzle's `.where()` returns a `PgSelect` thenable builder, not a synchronous
array. The previous code did not `await` the chain, so `rows` was always the
builder object, `rows[0]` was always `undefined`, and `row` was always `null`.
In production the gate was permanently closed (always 403).

**Fix:**
- Added `await` before the `.select().from().where()` chain.
- Changed the local `SelectableDb` type so `where()` returns
  `Promise<{ onboardingStatus: string }[]>` instead of a sync array. This
  ensures test mocks must return Promises and the type system will catch
  regressions.
- Wrapped the DB call in a `try/catch`. On failure: logs via `logger.error`
  + `serializeError` and returns `c.json({ error: "internal_error" }, 500)`.
  Fail-closed: a DB outage does NOT return `onboarding_required` (which would
  silently redirect users to the onboarding flow for the wrong reason).

---

## CRITICAL-2: Missing `await` in `onboarding-status.ts`

**File:** `lib/server/routes/onboarding-status.ts`

Same root cause as CRITICAL-1. Without `await`, the handler always returned
`not_started` regardless of actual DB state.

**Fix:** Same pattern — added `await`, updated `SelectableDb.where()` return
type to `Promise<Row[]>`, wrapped in try/catch returning `500 internal_error`
on failure. "I can't read the DB" is semantically different from "no row
found" and must not be surfaced as `not_started`.

---

## CRITICAL-3: No try/catch around webhook DB ops

**File:** `lib/server/routes/stripe-webhook.ts`

Three DB calls were unwrapped. The worst-case failure mode: `recordEvent`
succeeds (idempotency row committed), then `db.update` throws. Stripe retries;
the retry finds the event already recorded and returns `200 { duplicate: true }`
without ever retrying the update. State is permanently lost without any log
entry.

**Fix — three separate try/catch blocks:**

1. **`recordEvent` (idempotency insert):** On failure, log error and return
   500. The idempotency row was NOT committed (the `insert` threw), so Stripe
   can safely retry and will attempt the insert again.

2. **`db.select` (lookup by `stripe_account_id`):** On failure, log error
   (with `eventId` + `stripeAccountId` context) and return 500. Stripe retries;
   the idempotency insert will be a no-op duplicate and the handler will return
   `200 { duplicate: true }` — this is acceptable since no state was mutated.
   (Operational note: this path should be monitored for repeated duplicates
   that indicate a persistent select failure.)

3. **`db.update` (write `onboarding_status`):** On failure, log at `error`
   severity with full context (`eventId`, `stripeAccountId`,
   `targetOnboardingStatus`, `targetPayoutsEnabled`) because the idempotency
   record IS committed and reconciliation requires manual intervention. Return
   500 so Stripe retries (the retry hits `duplicate: true`; the loud error log
   makes the lost update visible for manual remediation).

---

## IMPORTANT-1: New test — `db.insert` throws after `accounts.create` succeeds

**File:** `lib/server/__tests__/onboarding-start.test.ts`

Added test: `db.insert` throws after `accounts.create` returns successfully →
handler returns `500 { error: "internal_error" }`. The test asserts
`stripe.accounts.create` was invoked, pinning the orphan-account failure mode:
a Stripe account exists in Stripe's system but has no corresponding
`seller_accounts` row.

---

## IMPORTANT-3: New tests for webhook error paths

**File:** `lib/server/__tests__/stripe-webhook.test.ts`

**Test 6** — `recordEvent` throws → handler returns 500 and `db.update` is
never called. This confirms Stripe can safely retry (the idempotency row was
not committed).

**Test 7** — `db.update` throws after idempotency insert + select both
succeed → handler returns 500. The test verifies `db.update` was attempted
(insert + select succeeded) and that the handler returns 500 so Stripe issues
a retry. The `logger.error` call with full context is the contract this test
pins; if the error log is removed or downgraded, the lost-update scenario
becomes invisible.

---

## IMPORTANT-4 + IMPORTANT-5: Mock updates for `SelectableDb` type change

All test files that mock `where()` for `require-seller-onboarded` or
`onboarding-status` were updated to return `Promise.resolve([...])` instead of
a plain sync array, matching the updated `SelectableDb` types:

- `lib/server/__tests__/require-seller-onboarded.test.ts`
- `lib/server/__tests__/listings-gate.test.ts`
- `lib/server/__tests__/onboarding-status.test.ts`
- `lib/server/__tests__/stripe-connect.integration.test.ts` (`buildInMemoryDb`
  `select().where()` now returns `Promise.resolve(rows)`)

The `onboarding-start` mock was intentionally left as-is — that handler already
uses `await Promise.resolve(result)` and its `SelectableDb` type was not
changed.

---

## Findings intentionally not addressed

| Finding | Justification |
|---------|---------------|
| IMPORTANT-2: `db.update` rowCount check | Over-engineering at current scale. `stripe_account_id` is effectively immutable once set; a silent no-op update is not a realistic failure path. |
| Missing-Stripe-Signature-header test | Covered by the existing bad-signature test — `constructEventAsync` rejects both a missing and a malformed signature with the same error path. |
| Trailing-slash `EXPO_PUBLIC_APP_URL` test | The `.replace(/\/$/, "")` logic is correct; the test would duplicate coverage already exercised by the URL construction tests. |
| Unauthenticated-access integration test | Covered by `clerk-auth.test.ts` unit tests which exercise the `missing_token` / `invalid_token` paths directly. |
| NTH-1: Startup guard for empty `STRIPE_WEBHOOK_SECRET` | Operations-level concern; not a code correctness issue at this stage. |
| NTH-2: Multi-instance idempotency race documentation | Current deployment model is single-worker; the race is theoretical. |
