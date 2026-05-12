---
run_id: 2026-05-12-s-1-4-gcd-lookup
phase: phase_4_review
schema_version: 1
status: changes_required
head_sha: 6a6051f
re_review_count: 0
---

# Phase 4 — Final Review (Panel + Corroboration)

Four reviewers ran in parallel against `run/2026-05-12-s-1-4-gcd-lookup` at
`6a6051f`. Findings are de-duplicated below; severity is the **corroborated
ceiling** (highest severity assigned across reviewers, downgraded when one
reviewer's CRITICAL is another's LOW).

## Reviewer verdicts

| Reviewer | Verdict | Counts |
|---|---|---|
| code-reviewer | CHANGES-REQUIRED | 1 critical · 2 high · 3 medium |
| test-analyzer | APPROVED-WITH-NOTES | 1 high · 4 medium · 2 low |
| silent-failure-hunter | CHANGES-REQUIRED | 1 critical · 1 medium · 1 low |
| type-design-analyzer | APPROVED-WITH-NOTES | 0 critical · 4 medium |

Aggregated verdict: **CHANGES-REQUIRED**.

## Must-fix before merge

### F1 (CRITICAL, corroborated) — `readCache` catch swallows errors silently

`lib/server/routes/catalog-search.ts:100-104` — bare `catch {}` with no log,
no `serializeError`, no `queryKey`. A DB connection failure or drizzle bug
will produce zero operational signal because the path silently falls through
to the adapter and returns a "successful" response (`degraded:false`,
`cacheHit:false`). Silent-failure-hunter CRITICAL; test-analyzer also flagged
this path as untested (MEDIUM).

**Fix:** Log warn with `serializeError(err)` + `queryKey` + normalized query
before falling through to adapter.

### F2 (HIGH, single reviewer but fixable in one line) — `app.ts` default `db` is a runtime trap

`lib/server/app.ts:61-65` — `db: {} as CatalogSearchDeps["db"]` is a stub
introduced during Phase 3 integration. In production this will throw on every
request (`.select is not a function`), get swallowed by F1's silent catch
(creating compound invisibility), and every cache lookup will silently miss.

**Fix:** Default to the existing `db` proxy from `~/lib/db/client.ts` so
production gets a real drizzle handle. Tests still inject overrides via the
deps bag.

### F3 (HIGH, single reviewer) — `_journal.json` missing idx 1

`drizzle/meta/_journal.json` lists idx 0 and idx 3 but no idx 1 (the existing
`0001_stripe_webhook_events.sql` is journal-orphaned — a pre-existing issue
from the stripe-connect run, not introduced here). Idx 2 is reserved for
S-1.3's PR #49 and will be filled when that PR merges. Drizzle's migrator
tolerates non-contiguous idx in some versions but rejects it in others; the
safe move is to backfill idx 1 since we're already touching the file.

**Fix:** Add idx 1 entry for `0001_stripe_webhook_events`. Leave the idx 2
slot for PR #49 to fill on merge.

### F4 (HIGH, test-analyzer) — TTL boundary not unit-tested

`lib/server/catalog/__tests__/cache.test.ts` — the existing readCache test
only asserts a non-undefined `where` clause is passed; it doesn't construct a
row with `expiresAt` in the past and assert the row is filtered. A `gte`-vs-
`gt` flip on the comparison would not be caught.

**Fix:** Add a unit test that wires a mock returning a future-expiry row
(hit) and a past-expiry row (filtered → miss), proving the WHERE clause
actually excludes expired entries.

## Deferred to follow-up (acknowledged, not blocking)

| ID | Issue | Reviewer | Why deferred |
|---|---|---|---|
| D1 | `AbortController` signal not threaded to `CatalogAdapter.search` | code (CRITICAL) / silent-failure (LOW) | Fixture adapter is in-memory; signal plumbing belongs with the real GCD adapter per ADR-0001. Add `TODO(S-1.4-followup)` marker. |
| D2 | `CatalogQuery` should be a discriminated union | type-design (MEDIUM) | Real ergonomic win when 3rd-party adapters land; current runtime validation in handler is correct. |
| D3 | `CacheDb` hand-rolled shape vs `Pick<PostgresJsDatabase, ...>` | type-design (MEDIUM) | `as never` casts in tests are a smell; tracked for cache-hardening pass. |
| D4 | `computeQueryKey` double-normalizes | code (MEDIUM) | Idempotent, harmless; trivial cleanup. |
| D5 | `writeCache` uses module logger, not injected one | code (MEDIUM) | Minor inconsistency; production logging still functional. |
| D6 | Drizzle AST walk in integration test is fragile | code + test (MEDIUM) | Documented brittleness; defer until in-process Postgres test tier exists. |
| D7 | `CATALOG_CACHE_TTL_DAYS` positive-value guard | type-design (LOW) | Env-var hardening; default 30 fallback already protects most cases. |
| D8 | Whitespace-only `q` on fixture adapter behavior unclear | test (MEDIUM) | Locked behind 400 invalid_query at handler; adapter unreachable with bare whitespace. |
| D9 | Normalization-bypass-via-mock in unit tests | test (MEDIUM) | Integration test exercises real normalization end-to-end. |
| D10 | Unicode + SQL-shaped `q` adversarial inputs | test (MEDIUM/LOW) | Defer to test hardening; no SQL surface (fixture is pure in-memory). |
| D11 | Fixture Zod parse vs `as CatalogMatch[]` cast | type-design (LOW) | Fixture is curated + small; mismatch would fail tests, not prod. |
| D12 | `setTimeout` not cleared on race winner | silent-failure (LOW) | No leak in current implementation; cosmetic. |
| D13 | `_journal.json` idx 2 slot empty | this review | PR #49 (S-1.3) owns this slot. Resolves at merge. |

## Remediation plan

One remediation cycle (cycle-5) addresses F1–F4 on the run branch directly
(no worktree; sequential single-thread fix). Aggregate budget consumed: 5 of
12 cycles. Re-review with minimal panel (2 reviewers) after remediation.

## Verifiable evidence

- `git diff --stat main..HEAD`: 31 files, +2427 lines.
- Test suite at HEAD: 104 suites / 658 tests pass.
- Typecheck + lint green.
- No `--no-verify` traces in cycle commits.
- Commit messages follow conventional-commits.
