---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: 4
acs_covered: [AC-3, AC-4]
status: complete
---

# Cycle 4 — Status read + listings publish gate

## Summary

Implements AC-3 (`GET /api/onboarding/status`) and AC-4 (gated `POST /api/listings` stub).

## Files written

- `lib/server/routes/onboarding-status.ts` — `onboardingStatusHandler` factory; synthesizes `not_started` when no `seller_accounts` row exists per ADR-0003.
- `lib/server/routes/listings-stub.ts` — `listingsStubHandler`; returns `204 No Content`. Gate applied upstream by `requireSellerOnboarded()`.
- `lib/server/__tests__/onboarding-status.test.ts` — 4 tests covering all four status values including the `not_started` synthesis branch.
- `lib/server/__tests__/listings-gate.test.ts` — 3 tests composing the real `requireSellerOnboarded()` middleware with the real `listingsStubHandler`; proves the gate blocks `pending` and missing-row, and passes `complete`.

## Verification

```
bun run typecheck  # clean
bun run lint       # clean
bun test lib/server/__tests__/onboarding-status.test.ts lib/server/__tests__/listings-gate.test.ts
# 7 pass, 0 fail
```

## Notes

- `listingsStubHandler` is intentionally trivial; the gate is exercised through `requireSellerOnboarded()` which lives in cycle-1.
- Both handlers follow the options-injection pattern (`deps.db ?? defaultDb`) matching `clerkAuth()` and `requireSellerOnboarded()`.
- `app.ts` wiring deferred to cycle-5 per the disjoint-files constraint.
