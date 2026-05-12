# Cycle 3 — Publish Endpoint (S-2.4 AC-2)

## Scope

Implemented `POST /api/listings/:id/publish` — the state-transition endpoint that flips a draft listing to `published`.

## Files Created

- `lib/server/routes/listings-publish.ts` — handler factory following the `listingsImagesConfirmHandler` pattern
- `lib/server/__tests__/listings-publish.test.ts` — 22 tests covering all branches

## Design Choices

**Handler factory with DB injection** (`listingsPublishHandler(deps)`): mirrors the existing `listingsImagesConfirmHandler` pattern. The `db` and `now` deps are injected for testability; production code falls back to `~/lib/db` and `new Date()`.

**Mock DB with call-count tracking**: the test mock uses a `selectCallCount` to distinguish listing vs images selects (first call = listing, second = images). This avoids requiring table identity in the mock while keeping the mock simple.

**Sequential awaited DB writes**: no transactions (Neon HTTP constraint). Only one write needed: `update listings set status, publishedAt, updatedAt`. No risk of partial state on this path.

**Grade numeric coercion**: `gradeNumeric` is a `numeric(3,1)` column; Drizzle/Neon may return it as a string. The validator coerces defensively via `parseFloat()` before range-checking.

**Validation accumulation**: all field errors are collected before returning 422, so the client gets the full error map in one round trip.

**Response shape**: the 200 response applies `status='published'`, `publishedAt=now`, and `updatedAt=now` to the in-memory listing row (avoiding a second DB read), then serializes timestamps to ISO strings.

## Test Coverage

22 tests, 0 failures:

- 404: listing not found
- 403: non-owner
- 409: already published, sold
- 422: series missing, issue missing, grade_company missing/invalid, grade_numeric out-of-range (low/high), price_cents missing/invalid/below-minimum, images_count missing/insufficient, multiple field accumulation
- 200: full happy path, grade_numeric as string, Raw grade company, price_cents=100 (boundary)
- 500: listing select throws, images select throws, update throws

## Pre-existing Failures

`catalog-search.test.ts` has 2 pre-existing failures due to `jest.advanceTimersByTimeAsync` not being available in bun's test runner. These exist on the base commit and are unrelated to this cycle.
