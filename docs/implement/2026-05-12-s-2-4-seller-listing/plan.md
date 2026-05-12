---
run_id: 2026-05-12-s-2-4-seller-listing
schema_version: 1
phase: plan
---

# Plan — Seller drafts and publishes a listing (S-2.4)

## Cycle inventory

### cycle-1 — Foundation: listings table + migration

- **id**: cycle-1
- **title**: Foundation — `listings` Drizzle schema + migration; remove `listings-stub` placeholder
- **goal**: Add the `listings` table to `lib/db/schema.ts` (id, sellerUserId FK, status enum, attribute fields, catalogMatchId nullable, publishedAt nullable, timestamps). Generate `drizzle/0004_listings.sql`. Add unit tests asserting columns + defaults. No route code yet.
- **acs_covered**: AC-5 (partial: catalogMatchId nullable lives at the schema level; full coverage lands in cycle-3 + cycle-4 logic)
- **file_paths**:
  - `lib/db/schema.ts`
  - `lib/db/__tests__/schema.test.ts`
  - `drizzle/0004_listings.sql`
- **reads_from**: `drizzle.config.ts`, `lib/db/client.ts`, prior migrations
- **deps**: []
- **test_strategy**: RED — extend `schema.test.ts` with `getTableColumns(listings)` assertions before the schema change. GREEN — table has columns `id`, `sellerUserId`, `status` (default `'draft'`), `series`, `issue`, `gradeCompany`, `gradeNumeric`, `priceCents`, `conditionNotes`, `catalogMatchId` (nullable), `publishedAt` (nullable), `createdAt`, `updatedAt` with correct types.

### cycle-2 — Draft endpoints (AC-1 + AC-4)

- **id**: cycle-2
- **title**: `POST /api/listings/draft` + `PATCH /api/listings/draft/:id` + `GET /api/listings/draft/:id`
- **goal**: Implement draft create/update/resume endpoints. Reuses `clerkAuth()` + `requireSellerOnboarded()`. Owner-only access on PATCH/GET (403 for non-owner). PATCH accepts partial subset of attribute fields. GET returns the latest draft state including images (joined) and selected catalog match.
- **acs_covered**: AC-1, AC-4
- **file_paths**:
  - `lib/server/routes/listings-draft-create.ts`
  - `lib/server/routes/listings-draft-update.ts`
  - `lib/server/routes/listings-draft-get.ts`
  - `lib/server/__tests__/listings-draft-create.test.ts`
  - `lib/server/__tests__/listings-draft-update.test.ts`
  - `lib/server/__tests__/listings-draft-get.test.ts`
- **reads_from**: `lib/db/schema.ts`, `lib/server/middleware/clerk-auth.ts`, `lib/server/middleware/require-seller-onboarded.ts`, `lib/server/types.ts`, `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — handler unit tests fail (modules don't exist). Pin: POST returns 201 with `{ id }`; 401 unauth; 403 onboarding incomplete. PATCH 200 with merged state; 403 non-owner. GET 200 with full draft + images array; 404 not found; 403 non-owner.

### cycle-3 — Publish endpoint with validation (AC-2)

- **id**: cycle-3
- **title**: `POST /api/listings/:id/publish` — 422 validation + state transition
- **goal**: Implement publish endpoint. Returns 422 with `{ error: "validation_failed", fields: {...} }` unless all required fields populated AND ≥2 confirmed images exist (counted from `images` table). On success: sets `status='published'`, `publishedAt=now()`, returns the published listing.
- **acs_covered**: AC-2
- **file_paths**:
  - `lib/server/routes/listings-publish.ts`
  - `lib/server/__tests__/listings-publish.test.ts`
- **reads_from**: `lib/db/schema.ts`, `lib/server/middleware/clerk-auth.ts`, `lib/server/middleware/require-seller-onboarded.ts`, `lib/server/types.ts`, `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — handler test fails (module doesn't exist). Pin: missing field returns 422 with per-field error keys (series, issue, grade_company, grade_numeric, price_cents, images_count); only 1 image returns 422 `images_count` error; happy path returns 200 with `{ status: "published", publishedAt }`; non-owner returns 403; double-publish returns 409.

### cycle-4 — Public listings index (AC-3)

- **id**: cycle-4
- **title**: `GET /api/listings` — filter-eligible public list (`status=published` only)
- **goal**: Implement public list endpoint returning published listings (no Clerk gate, parallel to public images-list). Supports `?status=published` filter (default + only allowed value in this run). Pagination via simple `limit`/`offset` for now. Returns `[{ id, series, issue, grade_company, grade_numeric, price_cents, published_at }]`. Crucially: AC-3 test asserts that a freshly published listing appears on the very next request.
- **acs_covered**: AC-3
- **file_paths**:
  - `lib/server/routes/listings-list.ts`
  - `lib/server/__tests__/listings-list.test.ts`
- **reads_from**: `lib/db/schema.ts`, `lib/server/types.ts`, `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — handler test fails. Pin: empty DB returns `{ listings: [], total: 0 }`; one published row returns it; draft rows excluded; published_at ordering desc; AC-3 integration test inserts a draft, publishes it via the published path or direct mutation, then asserts the list call returns it on the very next read.

### cycle-5 — Wire routes + integration walk (AC-1..AC-5 final green)

- **id**: cycle-5
- **title**: Integration — mount all 5 endpoints in `app.ts`, retire stub, walk draft → patch → publish → list
- **goal**: Import + mount the 4 new route handlers in `lib/server/app.ts`; remove the `listings-stub` mount (POST /api/listings → 204) since draft create supersedes it. Extend `CreateAppOptions` with `listingsDraft*Deps` and `listingsPublishDeps` and `listingsListDeps`. Add an integration walk test exercising the full lifecycle end-to-end against `createApp({ ...mockDeps })`.
- **acs_covered**: AC-1, AC-2, AC-3, AC-4, AC-5
- **file_paths**:
  - `lib/server/app.ts`
  - `lib/server/__tests__/listings-lifecycle-integration.test.ts`
  - `lib/server/routes/listings-stub.ts` (deletion)
- **reads_from**: all four cycle-2/3/4 outputs, `clerk-auth`, `require-seller-onboarded`
- **deps**: [cycle-2, cycle-3, cycle-4]
- **test_strategy**: Integration walks: create draft → PATCH fields → POST images/confirm (existing) → publish → list (assert appears). Manual-entry path (no `catalog_match_id`) covered explicitly. GREEN when `bun run typecheck && bun run lint && bun run test:ci` all pass.

### cycle-6 — Mobile sell flow (AC-6)

- **id**: cycle-6
- **title**: Expo Router `/sell` flow — create → attributes → photos → review → publish
- **goal**: Add `app/(app)/sell/` Expo Router segment with step-based screens. Persist each step's state to the server draft on transition (autosave). Resume from server state on remount. Use existing image upload + GCD catalog search (S-1.3 + S-1.4) where wired.
- **acs_covered**: AC-6 (and end-to-end exercise of AC-1, AC-4, AC-5)
- **file_paths**:
  - `app/(app)/sell/_layout.tsx`
  - `app/(app)/sell/index.tsx` (start)
  - `app/(app)/sell/attributes.tsx`
  - `app/(app)/sell/photos.tsx`
  - `app/(app)/sell/review.tsx`
  - `app/__tests__/sell-flow.test.tsx` (RTL component + reducer tests)
- **reads_from**: `lib/api-client` (or direct fetch), existing image components if any, `components/ds/*`
- **deps**: [cycle-2, cycle-3]
- **test_strategy**: RTL renders each screen; reducer-style tests for autosave (mock fetch); navigation tests assert step continuity after unmount. No real DB or network — all mocked. GREEN when component tests pass + typecheck clean.

## dep_graph

```
cycle-1 (foundation):        []
cycle-2 (draft endpoints):   [cycle-1]
cycle-3 (publish endpoint):  [cycle-1]
cycle-4 (public list):       [cycle-1]
cycle-5 (wire + integration):[cycle-2, cycle-3, cycle-4]
cycle-6 (mobile flow):       [cycle-2, cycle-3]
```

Wave 1 (serial):   cycle-1
Wave 2 (parallel): cycle-2, cycle-3, cycle-4
Wave 3 (parallel): cycle-5, cycle-6

## Disjoint-write verification

Wave 2 cycles write to fully disjoint paths:
- cycle-2 → `listings-draft-{create,update,get}.ts` + their tests
- cycle-3 → `listings-publish.ts` + test
- cycle-4 → `listings-list.ts` + test

Wave 3 cycles:
- cycle-5 → `lib/server/app.ts`, integration test, deletes `listings-stub.ts`
- cycle-6 → `app/(app)/sell/*`, `app/__tests__/sell-flow.test.tsx`

No overlap.

## Cycle count

6 planned (within soft-cap 8). Aggregate budget 12; remaining buffer 6 for remediation/retries.
