---
cycle: 3
run_id: 2026-05-11-backend-scaffold-baseline
branch: cycle-3/backend-scaffold-baseline
head_sha: 7039d4af01ef8a5656a6519b1954ff1b27c077b0
parent_sha: c23a12692d493dd43d917378c17fe2382af821ed
---

# Cycle 3 — /api/healthz + /api/me endpoints

## Summary

Implemented AC-3 (healthz + me handlers, Expo Router catch-all) and the
handler-test portion of AC-5. TDD discipline followed: failing tests written
first (6 RED), then minimal handler code brought them GREEN.

## Files changed

| File | Action |
|---|---|
| `app/api/[...path]+api.ts` | Created — Expo Router catch-all delegating to Hono |
| `lib/server/app.ts` | Modified — wired healthz/me routes; added `ClerkAuthOptions` param to `createApp()` |
| `lib/server/routes/healthz.ts` | Created — GET /api/healthz handler with 1s DB probe |
| `lib/server/routes/me.ts` | Created — GET /api/me handler (Clerk-gated, returns JWT claims) |
| `lib/server/__tests__/healthz.test.ts` | Created — 3 tests (resolve/reject/timeout) |
| `lib/server/__tests__/me.test.ts` | Created — 3 tests (missing token / invalid token / valid token) |
| `lib/server/__tests__/_jwks-helpers.ts` | Created — shared JWK key generation helpers |

## Test counts

- Test suites: 23 passed (was 21 before cycle-3)
- Tests: 129 passed (was 123 before cycle-3; +6 new)
- Failing: 0

## ACs covered

- **AC-3** — `/api/healthz` + `/api/me` endpoints + Expo Router catch-all
- **AC-5** — handler tests (partial; dev-script + README remain for cycle-4)

## AC test evidence

| AC | Test name | AC content word |
|---|---|---|
| AC-3 | "returns { status: 'ok', db: 'ok' } when DB probe resolves" | `healthz` |
| AC-3 | "returns { status: 'ok', db: 'down' } when DB probe rejects" | `healthz` |
| AC-3 | "returns { status: 'ok', db: 'down' } when DB probe exceeds 1 second" | `timeout` |
| AC-3 | "returns 401 + { error: 'missing_token' } without authorization header" | `me` |
| AC-3 | "returns 200 + { userId, email } for valid JWT" | `userId` |
| AC-5 | "returns 401 + { error: 'invalid_token' } for malformed JWT" | `mocked JWKS` (comment) |

## Deviations from plan

- `createApp()` signature extended to accept `ClerkAuthOptions` — the plan
  stated the test for `me.test.ts` should "reuse JWK helpers from
  clerk-auth.test.ts", which required a way to inject the mock JWKS into
  the wired app (not just into a bare middleware). Passing `ClerkAuthOptions`
  through `createApp()` is the minimal-intrusion approach: production callers
  use the default (empty object), tests inject `fetchJwks`. No production
  behavior changed.
- `_jwks-helpers.ts` extracted as a shared helper module. The plan offered
  this as a conditional ("extract if needed") — extraction was chosen because
  both `clerk-auth.test.ts` and `me.test.ts` need identical `buildJwks()`
  logic. `clerk-auth.test.ts` was NOT modified to import from the helper
  (it still has its own inline copy) — that refactor would expand scope
  beyond this cycle with no AC impact.
- Timer cleanup added to `probeDb()` with `clearTimeout` in the `finally`
  block — not mentioned in the plan but required to prevent a Jest open-handle
  warning that appeared on the first run.
