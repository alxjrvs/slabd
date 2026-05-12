---
run_id: 2026-05-12-s-1-4-gcd-lookup
cycle: 5
status: complete
parent_sha: 1fd0a5988f5a9a2147969a19ba642b313682e186
acs_covered: []
remediates: [F1, F2, F3, F4]
---

# Cycle 5 — Phase 4 Remediation

Direct-on-run-branch remediation (no worktree, no parallelism — F1–F4 touch
overlapping files). Fixes the four must-fix findings from `review.md`
without expanding scope.

## F1 — `readCache` silent catch → logged warn

**File:** `lib/server/routes/catalog-search.ts:100-108`

The cache-read fallback caught everything and continued silently. A
drizzle bug or DB outage produced zero operational signal because the
handler returned a normal-looking 200 with `cacheHit:false`. Now logs
`warn` with `serializeError(err)`, the offending `queryKey`, and the
normalized query before falling through to the adapter.

```ts
try {
  cached = await readCache(deps.db, key);
} catch (err) {
  log.warn("catalog-search: cache read failed, treating as miss", {
    err: serializeError(err),
    queryKey: key,
    query: normalized,
  });
}
```

## F2 — `app.ts` default `db` was a runtime trap

**File:** `lib/server/app.ts:36, 61-66`

`db: {} as CatalogSearchDeps["db"]` was a Phase-3 stub that would throw
on every production request. Now the resolved default uses the existing
`db` proxy from `~/lib/db` (lazy Neon HTTP client). Tests still inject
overrides via the deps bag.

```ts
import { db as defaultDb } from "~/lib/db";

const resolvedCatalogSearchDeps: CatalogSearchDeps = catalogSearchDeps ?? {
  db: defaultDb as unknown as CatalogSearchDeps["db"],
  adapter: new FixtureCatalogAdapter(),
  env: { CATALOG_CACHE_TTL_DAYS: ttlDays },
};
```

The cast remains because `CacheDb` is a hand-rolled `Pick`-style subset
of `PostgresJsDatabase` (tracked as D3, deferred).

## F3 — `_journal.json` missing idx 1

**File:** `drizzle/meta/_journal.json`

Idx 0 and 3 were present; idx 1 was orphaned (the S-1.2 stripe-connect
run merged the SQL file without the journal entry). Drizzle's migrator
tolerates non-contiguous idx in some versions and rejects it in others —
backfilled now since we're touching the file. Idx 2 deliberately left
open for PR #49 (S-1.3) to populate on merge.

## F4 — TTL boundary unit test

**File:** `lib/server/catalog/__tests__/cache.test.ts`

The previous test (`"passes a non-undefined where condition"`) only
asserted that *some* condition was provided. A `gt`→`gte` flip on the
comparison would not have been caught. Replaced with three stronger
tests:

1. **Operator-level proof.** Mocks `eq`/`gt`/`and` from `drizzle-orm` to
   return inspectable descriptor objects, then asserts the captured WHERE
   shape: `and(eq(queryKey, "some-key"), gt(expiresAt, <new Date()>))`.
   The bound on `gt.val` confirms the date is freshly minted at call
   time (`before ≤ value ≤ after`). A flip to `gte` fails the
   `__op === "gt"` assertion.
2. **Behavioral hit.** Mocks `where` to replay the captured condition
   against a future-expiry fixture row; asserts the row's payload is
   returned.
3. **Behavioral miss.** Same harness, past-expiry fixture row → filtered
   out → `readCache` returns `null`.

The drizzle-orm mock is scoped to this test file. Schema (`pg-core`) and
client (`neon-http`) entrypoints are untouched.

## Verifiable evidence

- `git diff --stat HEAD`: 4 files, +129 / −10.
- `bun run typecheck`: green.
- `bun run lint`: green.
- `bun run test:ci`: 104 suites / 660 tests pass (was 658; net +2 from F4
  replacing one weak test with three behavioral tests).

## Deferred follow-ups confirmed

D1–D13 from `review.md` remain deferred. No new findings introduced.
