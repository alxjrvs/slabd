---
run_id: 2026-05-11-s-1-2-stripe-connect
phase: phase_4_review
schema_version: 1
---

# Phase 4 — Final review

Two-pass review: full panel against the cycle-5 integration SHA, then a
minimal re-review panel (2 reviewers) against the cycle-6 remediation SHA
per the `implement:develop` post-remediation rule.

## Pass 1 — Full panel (`f3fe774`)

Verdict: **CHANGES-REQUIRED** (3 critical + 5 important).

Reviewers: `code-reviewer`, `silent-failure-hunter`, `pr-test-analyzer`,
`type-design-analyzer`, `comment-analyzer`.

| ID | Severity | File | Finding |
|----|----------|------|---------|
| CRITICAL-1 | critical | `lib/server/middleware/require-seller-onboarded.ts` | Missing `await` on Drizzle `.where()` chain. `rows` was a thenable PgSelect builder; `rows[0]` always undefined → gate permanently 403 in prod. Mocks were sync arrays so tests passed. |
| CRITICAL-2 | critical | `lib/server/routes/onboarding-status.ts` | Same missing `await`. Handler always returned `not_started` regardless of DB state. |
| CRITICAL-3 | critical | `lib/server/routes/stripe-webhook.ts` | No try/catch around three DB calls. Worst case: idempotency row commits, `db.update` throws, Stripe retry hits duplicate-true and returns 200 → state permanently lost with no log. |
| IMPORTANT-1 | important | `lib/server/routes/onboarding-start.ts` test gap | No test for `db.insert` throwing after `accounts.create` succeeded (orphan-account failure mode). |
| IMPORTANT-2 | important | `lib/server/routes/stripe-webhook.ts` | No rowCount check on `db.update`. Flagged but deferred: `stripe_account_id` is effectively immutable; silent no-op update isn't a realistic failure path at current scale. |
| IMPORTANT-3 | important | webhook test coverage | No tests for `recordEvent` throw or `db.update` throw error paths. |
| IMPORTANT-4 | important | `SelectableDb` type mismatch | After the await fix the type should encode `Promise<Row[]>` so the compiler enforces awaiting going forward. |
| IMPORTANT-5 | important | Test mocks | Sync-array mocks would have hidden CRITICAL-1/2; all `.where()` mocks need to return Promises. |

Findings deferred with justification: IMPORTANT-2 (over-engineering at
current scale); missing-Stripe-Signature-header test (covered by
bad-signature test); trailing-slash `EXPO_PUBLIC_APP_URL` test (covered
by URL construction tests); unauthenticated-access integration test
(covered by `clerk-auth.test.ts` units); NTH-1 startup guard for empty
secret (operations-level); NTH-2 multi-instance race doc (single-worker
deployment).

## Remediation — cycle 6 (`474595f`)

Single remediation cycle dispatched. Addressed: CRITICAL-1, CRITICAL-2,
CRITICAL-3, IMPORTANT-1, IMPORTANT-3, IMPORTANT-4, IMPORTANT-5. Record:
`cycles/cycle-6-remediation.md`.

Key changes:

- **`SelectableDb` type** in two files now declares `.where()` returns
  `Promise<Row[]>`, so the compiler enforces awaiting and blocks
  regression to sync-shaped mocks.
- **Three independent try/catch blocks** in the webhook handler. The
  `db.update` failure path logs `eventId`, `stripeAccountId`,
  `targetOnboardingStatus`, `targetPayoutsEnabled` at error severity
  with `serializeError(err)` — exactly the context an operator needs
  for manual reconciliation when the idempotency row is already
  committed.
- **Fail-closed semantics**: gate and status both return `500
  internal_error` on DB outage. Critically distinct from `403
  onboarding_required` (would silently misroute users to onboarding)
  and `not_started` (would silently mask actual state).
- **Mocks updated** across four test files to return
  `Promise.resolve([...])`. New tests pin the orphan-account path and
  both webhook DB error paths.

## Pass 2 — Re-review panel (`474595f`)

Verdict: **APPROVED** (minimal panel per `implement:develop` spec).

Reviewers: `code-reviewer`, `silent-failure-hunter`.

| Reviewer | Verdict | Confidence |
|----------|---------|------------|
| `code-reviewer` | APPROVED | high |
| `silent-failure-hunter` | APPROVED-WITH-NOTES | high |

Both confirmed: each critical bug fix reaches a real DB code path (not
`await`-stamped placeholders); fail-closed semantics correct; error
paths log enough context for operational remediation; no new silent
failures introduced; full unit suite green (66 tests in
`lib/server/__tests__/`).

Non-blocking note from `silent-failure-hunter`: `onboarding-start.ts`
logs `{ err }` directly in four places rather than using
`serializeError(err)` consistent with the remediated files. Worth
aligning later for stack-trace fidelity; not a regression introduced
by this run.

## Aggregate test evidence

| AC | Tests | Status |
|----|-------|--------|
| AC-1 (onboarding bootstrap) | `onboarding-start.test.ts` (6 incl. orphan), `stripe-connect.integration.test.ts` (chain) | green |
| AC-2 (webhook reconciliation) | `stripe-webhook.test.ts` (7 incl. recordEvent throw, db.update throw), integration test | green |
| AC-3 (status read) | `onboarding-status.test.ts` (incl. DB throw → 500) | green |
| AC-4 (publish gate) | `require-seller-onboarded.test.ts`, `listings-gate.test.ts`, integration test (gate-flip on status change) | green |
| AC-5 (env + migration + tests) | `idempotency.test.ts`, `stripe-client.test.ts`, `.env.example`, `wrangler.toml`, CI workflow | green |

Final integration SHA: `474595f`. Full suite: 179 tests, typecheck pass,
lint pass.

## Verdict

**APPROVED-WITH-NOTES** — ship.

Notes carried forward (out of scope for S-1.2):

- Align `onboarding-start.ts` error logs with `serializeError` pattern
  used elsewhere.
- Retention prune for `stripe_webhook_events` (per ADR-0002, 90 days).
- KYC threshold escalation lands in S-3.1.
- Verified-seller badge surfacing is a separate listing-render story.
- Production webhook secret rotation runbook when prod endpoint is
  configured.
