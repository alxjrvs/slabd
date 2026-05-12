# Cycle 4 — Public Listings Index (S-2.4 #7)

## Scope

Implement `GET /api/listings` — public, no-auth, paginated listings index filtered to `status='published'`, ordered by `publishedAt DESC`.

## Files Created

- `lib/server/routes/listings-list.ts` — handler factory
- `lib/server/__tests__/listings-list.test.ts` — 19 tests covering AC-3, pagination, status validation, error handling

## Design Choices

### Separate count query

The spec required `total` (count of all matching rows without pagination). Rather than a window function (`COUNT(*) OVER()`), a separate sequential `await` count query was used. This is correct for the Neon HTTP driver which does not support transactions — sequential awaited reads/writes are the prescribed pattern.

### Two typed interfaces for dependency injection

The `ListingsListDeps.db` field needed to satisfy two different query shapes:
- List query: `select().from().where().orderBy().limit().offset() => Promise<ListingRow[]>`
- Count query: `select({count}).from().where() => Promise<CountRow[]>`

A union return type on `where()` causes a TypeScript error at the call site (can't call `.orderBy()` on `Promise<CountRow[]>`). The solution was to define two separate interfaces (`ListQueryDb`, `CountQueryDb`) and cast at the call site with `as unknown as ListQueryDb` / `as unknown as CountQueryDb`. This mirrors the pattern used in `listings-images-list.ts`.

### Mock DB design

Test mocks distinguish the two query shapes by whether `select()` receives an argument:
- `select()` with no args → list query shape (`.where().orderBy().limit().offset()`)
- `select({count: ...})` with args → count query shape (`.where()` → `Promise`)

This avoids a fragile call-order counter and makes the mock self-describing.

### AC-3 "very next request" test

Uses a mutable `store: ListingRow[]` array captured by the mock DB closure. After the first request returns empty, the test pushes a published listing into the store, then immediately issues a second request. The second response reflects the updated store — demonstrating synchronous read-your-writes with no async queue.

## Coverage Notes

- 19 tests across: 200 happy path, response shape, AC-3 (3 named tests), pagination (5 tests), status validation (2 tests), error handling (1 test).
- TypeScript: clean (`tsc --noEmit`)
- ESLint: clean
- 58 tests pass across listings-list + listings-images-list + schema test files
