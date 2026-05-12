---
run_id: 2026-05-12-s-1-4-gcd-lookup
cycle: 4
ac_covered: [AC-5]
status: complete
---

# Cycle 4 — Wire + integration walk

## RED

Wrote `lib/server/__tests__/catalog-search.integration.test.ts` with four
tests before touching `app.ts`:

1. `AC-5: cache-miss → adapter dispatched → response has cacheHit:false`
2. `AC-5: second request with same query returns cacheHit:true — adapter NOT called again`
3. `AC-5: empty query param returns 400 invalid_query through wired route`
4. `AC-5: missing Authorization header returns 401 via Clerk middleware`

All four failed (`Cannot GET /api/catalog/search` — route not registered).

## GREEN

Modified `lib/server/app.ts`:

- Added imports for `createCatalogSearchHandler`, `CatalogSearchDeps`, and
  `FixtureCatalogAdapter`.
- Added `catalogSearchDeps?: CatalogSearchDeps` to `CreateAppOptions`.
- Inside `createApp`, reads `CATALOG_CACHE_TTL_DAYS` from
  `process.env.CATALOG_CACHE_TTL_DAYS` (parsed as int, defaults to 30).
- Builds `resolvedCatalogSearchDeps` defaulting to `FixtureCatalogAdapter`
  when `catalogSearchDeps` is not provided.
- Registered:
  ```
  app.use("/api/catalog/search", clerkAuth(clerkAuthOptions));
  app.get("/api/catalog/search", createCatalogSearchHandler(resolvedCatalogSearchDeps));
  ```

All four integration tests passed after these changes.

## REFACTOR

No structural refactor needed. The change matches the existing factory pattern
exactly (compare listings and onboarding wiring). The `CacheDb` stub in the
integration test uses the same SQL AST inspection technique as the
`stripe-connect.integration.test.ts` in-memory db mock.

## AC coverage

| AC   | Evidence |
|------|----------|
| AC-5 | `lib/server/__tests__/catalog-search.integration.test.ts` — 4 tests covering cache-miss walk, cache-hit walk (adapter call count = 1), 400 invalid_query, and 401 Clerk auth guard, all dispatched through `createApp`. |

## Files changed

- `lib/server/app.ts` — route registration + default DI
- `lib/server/__tests__/catalog-search.integration.test.ts` — new integration test file (4 tests)

## Verification

```
bun run typecheck && bun run lint && bun run test:ci
```

Result: `Test Suites: 104 passed, 104 total | Tests: 658 passed, 658 total`
(+1 suite, +4 tests over the 103/654 baseline).
