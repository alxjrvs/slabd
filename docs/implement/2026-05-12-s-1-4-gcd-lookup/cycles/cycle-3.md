---
run_id: 2026-05-12-s-1-4-gcd-lookup
phase: phase_2_cycle
cycle_id: cycle-3
acs_covered: [AC-2, AC-4]
---

# Cycle 3 — Search route + degradation contract

## Summary

Implemented `GET /api/catalog/search` handler factory and its full
degradation contract against cycle-1's cache signatures (real impl
lands in cycle-2). All 12 new tests pass; total suite grew from 196 to
208.

## RED phase

Wrote the test file first with all 7 required scenarios against the
`createCatalogSearchHandler` factory. The cache module was mocked via
`jest.mock("~/lib/server/catalog/cache", ...)` so the cycle-2 stubs
(which throw `not_implemented`) are never invoked. Tests failed because
the route file did not yet exist.

Discovered a secondary issue: `jest.config.js` in the worktree
contained `/.worktrees/` in `testPathIgnorePatterns`, which caused Jest
to silently exclude all test files when run from within the worktree
directory (since the absolute path contains `.worktrees/`). Removed
that entry so `bun run test:ci` works correctly from the worktree root.

## GREEN phase

Implemented `lib/server/routes/catalog-search.ts`:

- `CatalogSearchDeps` bag: `db`, `adapter`, `env.CATALOG_CACHE_TTL_DAYS`,
  optional `logger` (defaults to imported logger for testability).
- Validation: `q` with non-whitespace content OR (`series` + `issueNumber`
  both non-whitespace) is required; otherwise `400 { error: "invalid_query" }`.
- Cache check via `readCache`; on hit returns `cacheHit: true, degraded: false`.
- Timeout helper `withTimeout` using `Promise.race` + `setTimeout`. Passes
  an `AbortSignal` to abort the internal sentinel timer when not needed.
- On adapter success: best-effort `void writeCache(...)`, returns
  `cacheHit: false, degraded: false`.
- On adapter throw or timeout sentinel: `logger.warn("catalog-search: adapter
  failed", ...)` and returns `200 { matches: [], cacheHit: false, degraded: true }`.
  Never 5xx.

Timeout tests required `jest.advanceTimersByTimeAsync(1500)` (the async
variant) to flush both timer callbacks and the resulting promise chain.
The sync `advanceTimersByTime` left the test hanging at 5000ms.

## REFACTOR phase

- Added `jest.clearAllTimers()` before `jest.useRealTimers()` in timeout
  tests to prevent leaked timer handles causing "worker process failed to
  exit gracefully" warnings.
- No structural changes needed; handler was clean on first pass.

## AC coverage

- **AC-2** — `GET /api/catalog/search`: validates query params (400 on empty
  or whitespace), normalizes via `normalizeQuery`, keys via `computeQueryKey`,
  cache hit returns `cacheHit: true`, cache miss + adapter success returns
  `cacheHit: false`. Structured `?series=&issueNumber=` form also accepted.
- **AC-4** — 1400 ms `Promise.race` timeout with `AbortController` abort on
  sentinel. Adapter throw AND timeout both result in
  `200 { matches: [], cacheHit: false, degraded: true }` with
  `logger.warn("catalog-search: adapter failed", { err: serializeError(...), query })`.
  Never 5xx.

## Files changed

- `lib/server/routes/catalog-search.ts` — new handler factory
- `lib/server/__tests__/catalog-search.test.ts` — 12 tests
- `jest.config.js` — removed `/.worktrees/` from `testPathIgnorePatterns`
- `docs/implement/2026-05-12-s-1-4-gcd-lookup/cycles/cycle-3.md` — this file

## Tests added

File: `lib/server/__tests__/catalog-search.test.ts`

- AC-2: returns 200 with cache hit when readCache returns matches > returns matches with cacheHit:true and degraded:false
- AC-2: returns 200 with cache miss + adapter success > calls adapter, writes cache, returns cacheHit:false degraded:false
- AC-2: returns 400 invalid_query when both q and structured form are empty > returns 400 { error: 'invalid_query' } with no query params
- AC-2: returns 400 invalid_query when both q and structured form are empty > returns 400 when series is provided but issueNumber is missing
- AC-2: returns 400 invalid_query when both q and structured form are empty > returns 400 when issueNumber is provided but series is missing
- AC-2: returns 400 invalid_query when only whitespace > returns 400 for q with only spaces
- AC-2: returns 400 invalid_query when only whitespace > returns 400 for series+issueNumber with only whitespace
- AC-2: structured query (series + issueNumber) returns 200 > returns matches when series and issueNumber are both provided
- AC-4: returns 200 degraded with empty matches when adapter throws > returns { matches: [], cacheHit: false, degraded: true } on adapter throw
- AC-4: returns 200 degraded with empty matches when adapter exceeds 1400ms timeout > returns degraded:true before the slow adapter resolves
- AC-4: logs warn with serialized error on adapter failure > logs warn when adapter throws
- AC-4: logs warn with serialized error on adapter failure > logs warn when adapter times out

Total suite: 208 passing (was 196 before this cycle).
