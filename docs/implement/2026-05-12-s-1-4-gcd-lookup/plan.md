---
run_id: 2026-05-12-s-1-4-gcd-lookup
phase: phase_0_plan
schema_version: 1
status: complete
---

# Phase 0 — Plan

Four cycles. Cycle 1 lays the foundation (schema, env, adapter
interface, fixture, cache module interface). Cycles 2 and 3 are
siblings that run concurrently after cycle 1 lands: cycle 2 implements
the cache module behind cycle 1's interface; cycle 3 implements the
search route + degradation contract. Cycle 4 integrates them by wiring
the route into `lib/server/app.ts` and running an end-to-end walk.

## Cycle dependency graph

```
cycle-1: []                          (foundation)
cycle-2: [cycle-1]                   (cache impl)
cycle-3: [cycle-1]                   (search route)
cycle-4: [cycle-2, cycle-3]          (wire + integration)
```

## Cycles

### cycle-1 — Foundation

**AC coverage:** AC-1 (partial: interface + fixture adapter); AC-3/AC-5
scaffolding (schema, env, types only, no impl).

**Files (new):**
- `lib/db/schema.ts` — add `catalogSearchCache` Drizzle table
- `drizzle/migrations/<next>_catalog_search_cache.sql` — table + index
- `lib/server/catalog/types.ts` — `CatalogMatch`, `CatalogQuery`
- `lib/server/catalog/adapter.ts` — `CatalogAdapter` interface
- `lib/server/catalog/fixture-adapter.ts` — `FixtureCatalogAdapter`
- `lib/server/catalog/fixtures/issues.json` — curated fixture data
- `lib/server/catalog/cache.ts` — exported types + signatures only
  (`readCache`, `writeCache`, `normalizeQuery`, `computeQueryKey`); impl
  stubs throw `not_implemented` so cycle 3 cannot accidentally rely on
  shipped behavior before cycle 2 lands.
- `lib/server/catalog/__tests__/fixture-adapter.test.ts` — substring,
  issue-number, no-match
- `.env.example` — add `CATALOG_CACHE_TTL_DAYS=30`
- `wrangler.toml` — add the same under `[vars]` stub
- `.github/workflows/ci.yml` — extend soft-warn step

**Reads from:** intent.md, `lib/db/schema.ts`, `drizzle/migrations/`,
`.env.example`, `wrangler.toml`, `.github/workflows/ci.yml`.

### cycle-2 — Cache implementation

**AC coverage:** AC-3 (TTL cache, normalization, best-effort write).

**Files (modified/new):**
- `lib/server/catalog/cache.ts` — implement `normalizeQuery`,
  `computeQueryKey` (SHA-256 of normalized JSON), `readCache`
  (where `expires_at > now()`), `writeCache` (best-effort; logger.warn
  on failure)
- `lib/server/catalog/__tests__/cache.test.ts` — hit, miss, TTL
  boundary (just-expired returns null), normalization equivalence
  (mixed whitespace/case map to same key), write-failure logged

**Reads from:** cycle-1 (`adapter.ts`, `types.ts`, `cache.ts`
signatures, `lib/db/schema.ts`).

### cycle-3 — Search route + degradation

**AC coverage:** AC-2 (endpoint contract), AC-4 (degradation + timeout).

**Files (new):**
- `lib/server/routes/catalog-search.ts` — handler factory pattern
  matching `listings-images-list.ts` shape. Deps bag: `db`, `adapter`,
  `env: { CATALOG_CACHE_TTL_DAYS }`. Handler:
  1. Clerk-gated via existing middleware (wired in cycle 4)
  2. Parse + validate query → 400 `invalid_query` if empty
  3. Normalize query, compute key, check cache
  4. On cache hit: return `{ matches, cacheHit: true, degraded: false }`
  5. On cache miss: race adapter against 1400 ms timeout
  6. On adapter success: write cache (best-effort), return
     `{ matches, cacheHit: false, degraded: false }`
  7. On adapter failure (throw, timeout): log warn + return
     `{ matches: [], cacheHit: false, degraded: true }`
- `lib/server/__tests__/catalog-search.test.ts` — 200 cache-hit,
  200 cache-miss with adapter success, 400 invalid_query, 200 degraded
  on adapter throw, 200 degraded on timeout

**Reads from:** cycle-1 (`adapter.ts`, `types.ts`, `cache.ts`
signatures). Imports of cache functions are valid even though their
real impl lands in cycle 2 (compiles against types).

### cycle-4 — Wire + integration walk

**AC coverage:** AC-5 (env + migration + tests; wiring; end-to-end
walk).

**Files (modified/new):**
- `lib/server/app.ts` — register the catalog-search route via
  `createApp({ ... catalogAdapter, ... })`. Default DI uses
  `FixtureCatalogAdapter`; deps bag allows test override.
- `lib/server/__tests__/catalog-search.integration.test.ts` — full
  request through `createApp` covering cache miss → adapter dispatch →
  cache write → second request returns cacheHit:true.

**Reads from:** cycle-2 + cycle-3 outputs.

## Out-of-scope guard

The plan does NOT include:
- A real GCD / Comic Vine adapter implementation (intent §Out of scope).
- A listing-draft persistence layer (S-2.4).
- Cache invalidation/purge endpoints (intent §Out of scope).
- Background cache warming (intent §Out of scope).
- Per-user rate limiting (intent §Out of scope).

## Aggregate budget

Planned cycles: 4. Aggregate budget: 12 → 8 cycles available for
remediation / retries.
