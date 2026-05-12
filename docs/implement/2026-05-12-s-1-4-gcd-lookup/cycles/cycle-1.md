---
run_id: 2026-05-12-s-1-4-gcd-lookup
phase: phase_2_cycle
cycle_id: cycle-1
acs_covered: [AC-1]
---

# Cycle 1 — Foundation

## Summary

Landed the schema, types, adapter interface, fixture adapter, cache
stub, fixture JSON, migration, env-var declarations, and CI soft-warn
job that AC-1 and the AC-3/AC-5 scaffolding require.

**Schema (`lib/db/schema.ts`):** Added `catalogSearchCache` Drizzle table
with `queryKey` PK, `payload` JSONB typed as `CatalogMatch[]`,
`createdAt`, and `expiresAt`. Import updated to include `jsonb` from
`drizzle-orm/pg-core`.

**Migration (`drizzle/0003_catalog_search_cache.sql`):** Creates the
`catalog_search_cache` table and an index on `expires_at` for sweep
efficiency. Journal updated to entry idx 3.

**Catalog types (`lib/server/catalog/types.ts`):** `CatalogQuery` and
`CatalogMatch` as specified.

**Adapter interface (`lib/server/catalog/adapter.ts`):** Single-method
`CatalogAdapter` interface.

**Fixture data (`lib/server/catalog/fixtures/issues.json`):** 10 curated
entries covering Amazing Spider-Man #129/#252/#300 (including a
newsstand variant), Batman #251/#357, X-Men #1/#94, Action Comics #1,
and Fantastic Four #1.

**FixtureCatalogAdapter (`lib/server/catalog/fixture-adapter.ts`):**
Case-insensitive substring match on series, exact match on issueNumber,
`#N` token parsed from free-text `q`, results sorted by `catalogId`.

**Cache stubs (`lib/server/catalog/cache.ts`):** `normalizeQuery`,
`computeQueryKey`, `readCache`, `writeCache` all throw
`not_implemented (cycle-2)`.

**Env / CI:** `.env.example` and `wrangler.toml` updated with
`CATALOG_CACHE_TTL_DAYS` stubs. `check-catalog-config` soft-warn job
added to `.github/workflows/ci.yml` after `check-stripe-config`.

## Commit SHA

dcc0ea7

## Tests added

File: `lib/server/catalog/__tests__/fixture-adapter.test.ts`

- AC-1: fixture adapter substring match on series returns expected entries > returns all Amazing Spider-Man issues when searching by series substring
- AC-1: fixture adapter substring match on series returns expected entries > returns Batman issues when searching by partial series name
- AC-1: fixture adapter combined series + issue number match returns single entry > returns exactly one entry for Amazing Spider-Man #129
- AC-1: fixture adapter combined series + issue number match returns single entry > returns exactly one entry for Batman #251
- AC-1: fixture adapter q='Amazing Spider-Man #129' parses issue number from q and returns the matching entry > parses trailing #N from q and returns single matching entry
- AC-1: fixture adapter q='Amazing Spider-Man #129' parses issue number from q and returns the matching entry > handles q without issue number as series-only search
- AC-1: fixture adapter q='Amazing Spider-Man #129' parses issue number from q and returns the matching entry > is case-insensitive for q series parsing
- AC-1: fixture adapter no-match returns empty array > returns empty array for a series that does not exist
- AC-1: fixture adapter no-match returns empty array > returns empty array when issue number does not match
- AC-1: fixture adapter no-match returns empty array > returns empty array for empty query
- AC-1: fixture adapter results are stable-ordered by catalogId > returns results sorted alphabetically by catalogId
- AC-1: fixture adapter results are stable-ordered by catalogId > returns all results sorted by catalogId regardless of fixture order

Total suite: 196 passing (was 184 before this cycle).
