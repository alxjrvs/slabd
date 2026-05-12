# Phase 4 — Final Review (S-2.4)

**Run:** `2026-05-12-s-2-4-seller-listing`
**Branch:** `run/2026-05-12-s-2-4-seller-listing` @ `8262da1`
**Diff scope:** `e401838..HEAD` — 6 cycles + 5 integration merges + 1 remediation commit
**Issue:** #7

## Panel

| Reviewer | Scope |
|---|---|
| `pr-review-toolkit:code-reviewer` | Correctness, conventions, security, route ordering |
| `pr-review-toolkit:silent-failure-hunter` | Swallowed errors, mock fallbacks, ownership/auth semantics |
| `pr-review-toolkit:pr-test-analyzer` | AC coverage, labeling, test quality |

## Verdict: **APPROVED-WITH-NOTES**

Backend implementation is solid: route ordering invariant holds (PUBLIC `GET /api/listings` correctly registered before `/:id/publish`), Clerk + onboarding gates are mounted on every write endpoint, ownership checks return correct 403/404 codes, handler factory + dep-injection conventions match S-1.x precedent. Backend test coverage is strong — `listings-publish.test.ts` is exemplary (404/403/409/422/200/500 lanes, per-field error accumulation). The integration walk uses real `createApp()` composition and catches wiring regressions unit tests cannot.

The mobile sell flow is functionally wired but has known gaps that prevent on-device use without follow-up work. These are documented as ship notes rather than blocking issues because:
1. The mobile→authenticated-API pattern is unestablished project-wide (no existing screen calls a Clerk-gated endpoint with `Authorization: Bearer`); this is M1-polish scope, not S-2.4.
2. The mock image upload path mirrors the established convention of placeholdering pre-S-1.3-pipeline-integration UI.
3. AC-6's autosave-on-transition is partially covered (PATCH-on-submit tested; cross-mount resume not).

One critical AC violation was caught and fixed inline (Raw + null `grade_numeric` was 422'ing; AC-2 specifies numeric grade is slabbed-only). Remediation commit `8262da1`.

## Findings

### Fixed inline (remediation `8262da1`)

**F-1 [HIGH] Publish validator required `grade_numeric` for Raw**
`lib/server/routes/listings-publish.ts:107-116` returned `grade_numeric=missing` regardless of `grade_company`. AC-2: *"grade (enum: Raw, CGC, CBCS, plus numeric grade for slabbed)"* — Raw does not carry a numeric grade. Fixed: gated the numeric check on `gradeCompany ∈ {CGC, CBCS}`. Added `AC-2: Raw with null grade_numeric publishes` regression test.

### Deferred — tracked as follow-ups in ship.md

**F-2 [HIGH] Mobile fetch calls have no auth header or absolute base URL**
All six fetch calls in `app/(app)/sell/*.tsx` use bare relative URLs and omit `Authorization: Bearer`. This works in unit tests (`global.fetch` is stubbed) but cannot reach Clerk-gated routes on a real device. Project-wide gap — no existing mobile screen carries this pattern. Needs a typed API client that pulls the Clerk session token + `EXPO_PUBLIC_API_BASE`. (Pre-existing scaffold gap — call out in M2 polish.)

**F-3 [HIGH] `photos.tsx` upload is mock-only**
`app/(app)/sell/photos.tsx:32-78` fetches the signed `uploadUrl`, calls `void uploadUrl`, then `/confirm`s. No bytes hit R2. Publish gate passes because `images` rows exist, but downstream `images` will be empty in any environment where the test harness isn't injecting mocks. Mirrors the placeholder pattern from S-1.3 pre-pipeline screens. Gate behind `__DEV__` and surface the placeholder; complete the upload PUT in a polish run.

**F-4 [HIGH] Sell flow never resumes an existing draft**
`app/(app)/sell/index.tsx` unconditionally `POST`s a new draft on every mount. AC-6's *"unmount/relaunch resumes at the same step"* requires either SecureStore persistence of the active draft id or a `GET /api/listings/draft?mine=1&status=draft` lookup. Backend supports resume (`PATCH`+`GET` on `/draft/:id` both work and are tested in cycle-5's lifecycle walk); the mobile resume wiring is the gap.

**F-5 [HIGH] Mobile error handlers discard server error envelopes**
Every `!res.ok` branch in the sell flow drops the JSON body and surfaces a generic toast. The publish 422's `fields` map (`{series:"missing", price_cents:"invalid", images_count:"insufficient"}`) is reduced to "some required fields are missing or invalid" — the user can't tell which field failed. Same shape across `index.tsx`, `attributes.tsx`, `photos.tsx`, `review.tsx`.

**F-6 [MEDIUM] `price_cents >= 100` floor is stricter than AC-2**
AC-2 says `price_cents (positive integer)`. Handler enforces ≥100 (`$1.00`). Likely a deliberate guardrail against $0.01 listings but undocumented and diverges from the literal AC. Either relax to `>= 1` or document the floor in intent.md.

**F-7 [MEDIUM] `parseFloat` permissive coercion in publish validator**
`parseFloat("9.8abc") → 9.8` silently passes. Switch to `Number()` + `Number.isFinite` or a regex (`/^\d+(\.\d)?$/`).

**F-8 [MEDIUM] AC labeling discrepancies**
- `listings-lifecycle-integration.test.ts:551` labels public-no-auth as "AC-5", but intent AC-5 is `catalog_match_id=NULL`. The public-no-auth property belongs to AC-3. (Catalog-NULL is *latently* covered — the lifecycle fixtures use `catalogMatchId: null` end-to-end — but never asserted by name.)
- `listings-gate.test.ts` describe says `"listings publish gate (AC-4)"`; the assertions cover AC-1 (draft create auth gate). Likely a stale label from an earlier intent revision.
Both are pure renames, no behavior change. Address in a labels-only follow-up alongside an explicit `AC-5: publish succeeds with catalog_match_id=null (manual entry)` test.

**F-9 [MEDIUM] AC-6 has zero tagged tests; `photos.tsx` has no test file at all**
Sell stepper transitions and the autosave property are not directly asserted. Add `AC-6:`-prefixed coverage in a polish run.

**F-10 [LOW] AC-1's 401-unauthenticated branch is not tested in the lifecycle walk**
All gate tests inject a userId or send a Bearer token. Add one no-Authorization-header request per gated route to lock the wiring.

**F-11 [LOW] Server route handlers don't thread `errorId`s for Sentry grouping**
`logger.error` calls include `serializeError` but lack stable IDs from `constants/errorIds.ts`. Cosmetic; address in the next observability sweep.

### No findings

- Auth gate placement: correct on all five new endpoints
- Route ordering: PUBLIC `GET /api/listings` registered before `/:id/publish` middleware — invariant holds
- Ownership checks: consistent 404 (not-found) / 403 (wrong owner) discrimination across draft-get / draft-update / publish
- Schema migration: clean, idempotent, matches the scaffold ADR

## Severity-keyword audit

Grep for `TODO|FIXME|XXX|HACK|TEMP|DEPRECATED|UNSAFE|UNSTABLE` in the diff:

```
app/(app)/sell/photos.tsx:   (Mock) button label — acknowledged in F-3
```

Single hit, explicitly documented as a known mock-only seam. Clean.

## Tests

```
bun test lib/server/__tests__/listings-publish.test.ts
  → 23 pass, 0 fail, 66 expects (includes the new AC-2 Raw regression)

bun test lib/server/__tests__/listings-publish.test.ts \
         lib/server/__tests__/listings-lifecycle-integration.test.ts
  → 26 pass, 0 fail, 106 expects

bun run typecheck → clean
bun run lint      → clean
```

Pre-existing failures (NOT regressions from this run): 4 failures in
`lib/server/__tests__/catalog-search.test.ts` using
`jest.advanceTimersByTimeAsync` (bun's runner doesn't expose it).
Confirmed present at base SHA `e401838` via
`git show e401838:lib/server/__tests__/catalog-search.test.ts | grep advanceTimersByTimeAsync`.
Shipped with S-1.4 (#50, commit `1cdba54`). Not blocking S-2.4.

## Re-review

Single pass. The inline remediation (`8262da1`) was a 3-line backend fix
with a regression test; no re-panel needed.
