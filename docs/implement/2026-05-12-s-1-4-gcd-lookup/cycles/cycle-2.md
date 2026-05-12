---
run_id: 2026-05-12-s-1-4-gcd-lookup
cycle: 2
phase: phase_tdd_cycle
schema_version: 1
status: complete
parent_sha: f62fe9893aae6ce8e19537e78e57f3aaa03e1320
acs_covered: [AC-3]
---

# Cycle 2 — Postgres TTL cache + query normalization

## What landed

- `lib/server/catalog/cache.ts` — replaced four `not_implemented` stubs with
  real implementations:
  - `normalizeQuery`: lowercase + trim + collapse internal whitespace on all
    present string fields; strips leading zeros from `issueNumber`
    (e.g. `"007"` → `"7"`); preserves `undefined` fields as `undefined`.
  - `computeQueryKey`: SHA-256 hex of stable JSON (fields emitted in fixed
    order `q`, `series`, `issueNumber`; `undefined` fields omitted).
  - `readCache`: drizzle select with compound `and(eq(queryKey), gt(expiresAt, now()))`;
    returns `payload` on hit, `null` on miss/expiry.
  - `writeCache`: drizzle insert + `onConflictDoUpdate` to refresh on rewrite;
    TTL applied as `now() + ttlDays * 86400000 ms`; best-effort — exceptions
    caught, logged via `logger.warn("catalog-search: cache write failed", ...)`
    with `serializeError(err)` and `queryKey`, never thrown.
- `lib/server/catalog/__tests__/cache.test.ts` — 21 new tests covering all
  four functions.
- `jest.config.js` — removed `/.worktrees/` from `testPathIgnorePatterns` so
  tests run when Jest is invoked from within the worktree.

## RED → GREEN → REFACTOR

**RED:** Wrote 21 tests against the stub implementations; all failed with
`Error: not_implemented (cycle-2)` on first run (confirmed via targeted Jest
invocation).

**GREEN:** Implemented all four functions. Tests went from 0 passing → 21
passing in one pass. Full suite (`bun run test:ci`) remained green at 217
tests across 34 suites.

**REFACTOR:** Cleaned up a `CacheDb` type definition that initially used
`ReturnType<typeof gt> | ReturnType<typeof and>` — replaced with drizzle's
exported `SQL | undefined` type, which is what `and()` actually returns and
what the real drizzle `where()` accepts. Fixed one lint warning (`Array<T>`
→ `T[]`). No functional changes.

## AC-3 coverage

| Requirement | Test |
|---|---|
| Normalized query maps equivalent inputs to same key | `computeQueryKey returns the same hash for queries that differ only in case and whitespace` |
| Whitespace collapse + lowercase on all string fields | `normalizeQuery lowercases, trims, and collapses internal whitespace on q` |
| Leading-zero strip on issueNumber | `normalizeQuery strips leading zeros from issueNumber (007 → 7)` |
| undefined fields preserved (not coerced) | `normalizeQuery leaves undefined fields undefined` |
| Cache hit returns payload | `readCache returns payload array on cache hit` |
| Cache miss returns null | `readCache returns null on cache miss` |
| Expired entries excluded by WHERE clause | `readCache passes a non-undefined where condition (expired entries excluded by clause)` |
| TTL applied correctly to expires_at | `writeCache calls insert.values with queryKey, payload, and expires_at offset by ttlDays` |
| Upsert on conflict refreshes payload + expiry | `writeCache calls onConflictDoUpdate with payload + expiresAt for upsert` |
| Write failure logged + swallowed | `writeCache swallows insert error and calls logger.warn with serialized error and queryKey` |

## Files changed

- `lib/server/catalog/cache.ts` (modified — replaced stubs)
- `lib/server/catalog/__tests__/cache.test.ts` (created — 21 tests)
- `jest.config.js` (modified — worktree path fix)
- `docs/implement/2026-05-12-s-1-4-gcd-lookup/cycles/cycle-2.md` (created)
