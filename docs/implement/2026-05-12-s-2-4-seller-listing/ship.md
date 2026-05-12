# Phase 5 — Ship (S-2.4)

**Run:** `2026-05-12-s-2-4-seller-listing`
**Branch:** `run/2026-05-12-s-2-4-seller-listing` @ `8262da1`
**Issue:** #7 — "Seller drafts and publishes a listing"
**PR strategy:** `one`
**Verdict carried from Phase 4:** APPROVED-WITH-NOTES

## What shipped

Six cycles + one Phase-4 remediation:

| # | Commit | Scope |
|---|---|---|
| 1 | `ff776b0` | Listings table schema + Drizzle migration |
| 2 | `0162338` | `POST/PATCH/GET /api/listings/draft[/:id]` handlers |
| 3 | `523b6cc` | `POST /api/listings/:id/publish` with 422 per-field validation |
| 4 | `2182976` | `GET /api/listings?status=published` public index |
| 5 | `b350503` | Wire routes into `createApp()` + lifecycle integration walk |
| 6 | `a78dcb8` | Mobile sell flow under `app/(app)/sell/` |
| F | `8262da1` | Raw + null `grade_numeric` regression fix (Phase 4 finding) |

## AC coverage

| AC | Status | Evidence |
|---|---|---|
| AC-1 — auth + onboarding gate on draft create | ✅ tested | `listings-gate.test.ts`, `listings-draft-create.test.ts` (401/403/200); lifecycle walk |
| AC-2 — publish 422 per-field validation | ✅ tested | `listings-publish.test.ts` (22 lanes); includes the new Raw+null-numeric regression |
| AC-3 — status='published' + synchronous public visibility | ✅ tested | `listings-list.test.ts` synchronous-visibility test; `listings-publish.test.ts` state transition |
| AC-4 — PATCH persistence + GET resume | ✅ tested | `listings-draft-update.test.ts`, `listings-draft-get.test.ts`, lifecycle walk |
| AC-5 — `catalog_match_id=NULL` does not block | ✅ latent | Lifecycle walk uses `catalogMatchId: null` end-to-end; never asserted *by name* — see follow-up F-8 below |
| AC-6 — mobile stepper create→attributes→photos→review→publish + autosave | ⚠️ partial | Three of four screens have component tests; PATCH-on-submit tested but cross-mount resume + photos screen untested — see follow-ups F-3, F-4, F-9 below |

## Known follow-ups (not blocking)

These were surfaced in Phase 4 review and explicitly carried forward
rather than remediated inline. Each should become its own issue in M2
polish (analogous to the M1 polish run #51 that closed #31–#37).

- **F-2** Mobile API client with Clerk session token + `EXPO_PUBLIC_API_BASE`. The mobile→authenticated-API pattern is unestablished project-wide; this is a M1/M2 polish concern that affects every Clerk-gated screen, not just S-2.4.
- **F-3** Replace `photos.tsx` mock upload with the real signed-URL PUT (S-1.3 pipeline is shipped — this is connecting the wire).
- **F-4** Sell-flow draft resume: SecureStore the active draft id (or add a `GET /api/listings/draft?mine=1&status=draft` lookup). AC-6's cross-mount resume property depends on it.
- **F-5** Mobile error envelopes: parse `error` + `fields` from server 422 responses and surface per-field messaging.
- **F-6** Document the `price_cents >= 100` floor in intent.md, or relax to `>= 1`.
- **F-7** Tighten `parseFloat` to `Number()` + `Number.isFinite` in publish validator.
- **F-8** AC label rename: cycle-5 lifecycle test "AC-5" → "AC-3"; gate test "AC-4" → "AC-1". Add an explicit `AC-5: publish succeeds with catalog_match_id=null` assertion.
- **F-9** AC-6 tagged coverage + a `photos.tsx` test file.
- **F-10** AC-1 401-unauth branch test for each gated route.
- **F-11** Thread `errorId`s from `constants/errorIds.ts` through new route logger calls.

## Pre-existing test failures (NOT regressions)

`bun test` reports 4 failures in `lib/server/__tests__/catalog-search.test.ts`
using `jest.advanceTimersByTimeAsync` (bun's test runner doesn't expose it).
Confirmed pre-existing at base SHA `e401838`:

```bash
git show e401838:lib/server/__tests__/catalog-search.test.ts | grep advanceTimersByTimeAsync
# → present at base SHA — shipped in S-1.4 (#50, commit 1cdba54)
```

Outside S-2.4 scope. Should be addressed by the S-1.4 owner in a polish
run (port to bun's `setSystemTime` or wrap in `process.env.JEST_RUNNER`-
guarded skip).

## Verification before ship

```
bun run typecheck                                                              → clean
bun run lint                                                                   → clean
bun test lib/server/__tests__/listings-publish.test.ts                         → 23 pass / 0 fail / 66 expects
bun test lib/server/__tests__/listings-publish.test.ts \
         lib/server/__tests__/listings-lifecycle-integration.test.ts           → 26 pass / 0 fail / 106 expects
bun test app/__tests__/sell/                                                   → component tests pass (11 tests across 3 suites)
```

## Ship actions

1. Commit this run's `docs/implement/2026-05-12-s-2-4-seller-listing/`
   folder (cycle envelopes, cycle plans, review.md, ship.md).
2. Push `run/2026-05-12-s-2-4-seller-listing` with `-u origin`.
3. `gh pr create` against `main` titled
   `feat(listings): seller drafts and publishes a listing (closes #7)`.
4. Issue #7 closes automatically when PR merges.

## Cost telemetry

Token + dollar cost not centrally tracked for this run (manual recovery
from the backgrounded-agent worktree-isolation incident in Phase 2 —
see the recovery commits noted in the run summary). Future runs should
restore envelope-level cost tracking once the develop skill's dispatch
loop is back on its standard synchronous-parallel path.
