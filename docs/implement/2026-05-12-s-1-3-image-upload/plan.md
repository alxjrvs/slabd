---
run_id: 2026-05-12-s-1-3-image-upload
schema_version: 1
phase: plan
---

# Plan — Image Upload Pipeline (S-1.3)

## Cycle inventory

### cycle-1 — Foundation: schema + env + migration

- **id**: cycle-1
- **title**: Foundation — `listingImages` Drizzle schema, migration SQL, env vars, CI soft-warn
- **goal**: Extend `lib/db/schema.ts` with the `listingImages` table, generate the Drizzle migration SQL, register all 5 new CF env vars in `.env.example` / `wrangler.toml` / CI soft-warn step. No route code.
- **acs_covered**: AC-5 (partial: schema + env; final test-green lands in cycle-5)
- **file_paths**:
  - `lib/db/schema.ts`
  - `lib/db/__tests__/schema.test.ts`
  - `drizzle/0001_images.sql`
  - `.env.example`
  - `wrangler.toml`
  - `.github/workflows/ci.yml`
- **reads_from**: `drizzle.config.ts`, `lib/db/client.ts`
- **deps**: []
- **test_strategy**: RED — add `listingImages` column assertions to `schema.test.ts` before writing the schema. GREEN — `getTableColumns(listingImages)` returns `id`, `listingId`, `r2Key`, `position`, `isPrimary`, `createdAt` with correct types/defaults. CI soft-warn job wiring verified by reading the yml diff.

### cycle-2 — Signed-URL issuance (AC-1)

- **id**: cycle-2
- **title**: `POST /api/listings/:id/images/upload-url` — SigV4 presigner + ownership gate
- **goal**: Implement the presigned-URL endpoint with Clerk + ownership gate, 8-image cap, and `aws4fetch` SigV4 presigner returning `{ uploadUrl, key, expiresAt }`.
- **acs_covered**: AC-1
- **file_paths**:
  - `lib/server/r2/presign.ts`
  - `lib/server/routes/listings-images-upload-url.ts`
  - `lib/server/__tests__/listings-images-upload-url.test.ts`
- **reads_from**:
  - `lib/db/schema.ts`
  - `lib/server/middleware/clerk-auth.ts`
  - `lib/server/types.ts`
  - `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — handler unit tests fail (module doesn't exist). Pin: 403 on non-owner listing, 400 on 8-image cap, 200 with `{ uploadUrl, key, expiresAt }` where `uploadUrl` starts with `https://` and `expiresAt` is within 300 s of now. Mock presigner injected via deps; real `presignR2Put` never called in tests.

### cycle-3 — Confirm + primary swap (AC-2)

- **id**: cycle-3
- **title**: `POST /api/listings/:id/images/confirm` — insert + atomic primary-image swap
- **goal**: Implement the confirm endpoint: insert `images` row, enforce 8-image cap, atomically demote the previous primary when `isPrimary: true`.
- **acs_covered**: AC-2
- **file_paths**:
  - `lib/server/routes/listings-images-confirm.ts`
  - `lib/server/__tests__/listings-images-confirm.test.ts`
- **reads_from**:
  - `lib/db/schema.ts`
  - `lib/db/client.ts`
  - `lib/server/types.ts`
  - `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — handler unit tests fail (module doesn't exist). Pin: successful confirm returns 200 with created row; `isPrimary: true` path calls the demote-update before insert in mock; cap at 8 returns `400 { error: "image_limit_exceeded" }`; non-owner returns 403.

### cycle-4 — Public image list with variant URLs (AC-3 + AC-4)

- **id**: cycle-4
- **title**: `GET /api/listings/:id/images` — ordered list with CF Images variant URLs
- **goal**: Implement the public (no Clerk gate) list endpoint returning records sorted primary-first then by `position`, each with a `variants: { card, thumb, detail }` object built from `CF_IMAGES_ACCOUNT_HASH`.
- **acs_covered**: AC-3, AC-4
- **file_paths**:
  - `lib/server/images/variant-url.ts`
  - `lib/server/routes/listings-images-list.ts`
  - `lib/server/__tests__/listings-images-list.test.ts`
- **reads_from**:
  - `lib/db/schema.ts`
  - `lib/server/types.ts`
  - `lib/logger.ts`
- **deps**: [cycle-1]
- **test_strategy**: RED — `variant-url` unit test and handler test both fail. Pin: `buildVariants("abc123", "hash")` returns correct URL shapes; list returns records ordered with primary first; response contains no R2 URLs (no `r2cloudflarestorage.com` domain in any field).

### cycle-5 — Integration: wire routes + full test suite green (AC-5 complete)

- **id**: cycle-5
- **title**: Integration — wire image routes into `app.ts` + integration walk test
- **goal**: Import and register all three image route handlers in `lib/server/app.ts`, extend `CreateAppOptions`, and add an integration test walking upload-url → confirm → list end-to-end against the composed app.
- **acs_covered**: AC-1, AC-2, AC-3, AC-4, AC-5 (final green)
- **file_paths**:
  - `lib/server/app.ts`
  - `lib/server/__tests__/listings-images-integration.test.ts`
- **reads_from**:
  - `lib/server/routes/listings-images-upload-url.ts`
  - `lib/server/routes/listings-images-confirm.ts`
  - `lib/server/routes/listings-images-list.ts`
  - `lib/server/images/variant-url.ts`
  - `lib/server/r2/presign.ts`
  - `lib/server/middleware/clerk-auth.ts`
- **deps**: [cycle-2, cycle-3, cycle-4]
- **test_strategy**: Integration test uses `createApp({ ...mockDeps })`, injects userId via middleware, and walks the full upload-url → confirm → list flow. GREEN when `bun run typecheck && bun run lint && bun run test:ci` passes with no suppressions.

## dep_graph

```
cycle-1 (foundation):  []
cycle-2 (signed-url):  [cycle-1]
cycle-3 (confirm):     [cycle-1]
cycle-4 (list):        [cycle-1]
cycle-5 (integration): [cycle-2, cycle-3, cycle-4]
```

Wave 1 (serial):   cycle-1
Wave 2 (parallel): cycle-2, cycle-3, cycle-4
Wave 3 (serial):   cycle-5

## Disjoint-write verification

Cycles 2/3/4 (the parallel wave) write to fully disjoint paths:

- cycle-2 → `r2/presign.ts`, `routes/listings-images-upload-url.ts`, its test
- cycle-3 → `routes/listings-images-confirm.ts`, its test
- cycle-4 → `images/variant-url.ts`, `routes/listings-images-list.ts`, its test

They share `reads_from` on `lib/db/schema.ts` and `lib/server/types.ts` (read-only after cycle-1). Cycle-5 is the only writer touching `lib/server/app.ts`.
