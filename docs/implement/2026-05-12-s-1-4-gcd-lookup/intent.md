---
run_id: 2026-05-12-s-1-4-gcd-lookup
issue: 6
phase: phase_define
schema_version: 1
source:
  kind: issue
  ref: "#6"
---

# Intent — GCD catalog lookup (S-1.4)

Land the backend half of **S-1.4**: a `CatalogAdapter`-fronted search
endpoint that returns comic issue/series matches for the seller's
listing-creation flow, wrapped by a Postgres TTL cache, with a
manual-entry-preserving degradation contract when the upstream adapter
fails. The full mobile picker UI that consumes this endpoint ships in a
follow-up client story; the listing draft/publish flow that
post-processes selected matches ships in S-2.4.

The architecture (`ideate/architecture.md` §S-1.4 / §Scenario "Seller
creates a listing") explicitly designs `CatalogAdapter` as a swappable
abstraction so the real GCD wiring can be added once licensing is
settled (REQ-036 risk register). This run ships the interface + a
fixture-backed adapter sufficient to unblock S-2.4 and exercise the
cache + degradation paths end-to-end. The real GCD/Comic Vine adapter
wiring is explicitly deferred to a separate story gated on licensing.

## Acceptance Criteria

- **AC-1 — `CatalogAdapter` interface + fixture-backed default
  adapter.** A new `CatalogAdapter` interface lives in
  `lib/server/catalog/adapter.ts` with a `search(query) →
  Promise<CatalogMatch[]>` contract. `query` accepts either a free-text
  `q` string ("Amazing Spider-Man #129") or structured
  `{ series?, issueNumber? }`. `CatalogMatch` carries `catalogId`
  (stable across requests for cache keying), `series`, `issueNumber`,
  `variant?`, `publisher?`, `publishedYear?`, and `coverThumbnailUrl?`.
  A default `FixtureCatalogAdapter` loads a curated JSON fixture from
  `lib/server/catalog/fixtures/issues.json` and supports
  case-insensitive substring matching on series and exact match on
  issue number. The real GCD/Comic Vine adapter is a TODO stub with
  `TODO(S-1.4-followup)` markers — never invoked from the wired route.

- **AC-2 — `GET /api/catalog/search` endpoint.** Clerk-gated. Accepts
  `?q=<free text>` OR `?series=<s>&issueNumber=<n>`. Returns
  `200 { matches: CatalogMatch[], cacheHit: boolean, degraded: boolean }`.
  Returns `400 { error: "invalid_query" }` when both `q` and the
  structured form are missing/empty. Returns `401` when Clerk-auth is
  missing (handled by middleware). Query is normalized server-side
  (lowercased, whitespace-collapsed, trimmed) before adapter dispatch
  AND before cache-key derivation so equivalent searches share cache
  entries.

- **AC-3 — Postgres TTL cache wraps the adapter.** A new
  `catalog_search_cache` table (`query_key` PK as SHA-256 of normalized
  query JSON, `payload` JSONB of matches, `created_at`, `expires_at`)
  stores adapter results. On request, the route first checks the cache;
  unexpired hits return immediately with `cacheHit: true`. On miss, the
  adapter is invoked and its result is written to the cache before
  responding with `cacheHit: false`. TTL is configured via
  `CATALOG_CACHE_TTL_DAYS` env var, default `30`. Cache write failures
  are logged via `logger.warn(... serializeError(err) ...)` and do NOT
  fail the request (best-effort write).

- **AC-4 — Manual-entry-preserving degradation contract.** When the
  adapter throws (network error, malformed response, timeout) the
  endpoint returns
  `200 { matches: [], cacheHit: false, degraded: true }` and logs
  `logger.warn("catalog-search: adapter failed", { err: serializeError(err), query })`.
  The route never bubbles upstream errors to the client as 5xx — the
  contract is that the seller's listing flow always sees a response and
  can fall through to manual entry. Adapter dispatch is wrapped in a
  `1400 ms` timeout (`Promise.race` + `AbortController` where the
  adapter supports it); timeout is treated as an adapter failure for
  the degradation contract.

- **AC-5 — Env vars, migration, ontology, and test coverage.**
  - Env vars declared in `.env.example`, `wrangler.toml` `[vars]`
    stubs, and CI soft-warn step in `.github/workflows/ci.yml`:
    `CATALOG_CACHE_TTL_DAYS` (default 30).
  - Drizzle migration creates `catalog_search_cache` with the columns
    described in AC-3 and an index on `expires_at` for sweep efficiency.
  - `lib/server/app.ts` wires the route under
    `GET /api/catalog/search` using the established `createApp({...})`
    DI factory pattern. The default DI wiring uses
    `FixtureCatalogAdapter`; tests can substitute via the deps bag.
  - Unit + integration tests cover: adapter interface contract,
    fixture adapter happy path (substring match, issue-number match,
    no-match), cache hit/miss flow, TTL expiration boundary,
    adapter-error → `degraded: true` fallback, timeout → `degraded: true`
    fallback, query normalization equivalence, 400 invalid_query, and
    end-to-end walk through `createApp`.
  - `bun run typecheck && bun run lint && bun run test:ci` is green.

## Out of scope

- **Real GCD / Comic Vine adapter wiring.** Gated on licensing per
  architecture risk register. A follow-up story will implement
  `GCDCatalogAdapter` against the eventual licensed source.
- **Mobile catalog-picker UI** (the seller-facing search surface).
  Separate client-side story (S-2.4 listing flow consumer).
- **Listing prefill persistence.** S-1.4 returns matches; S-2.4 writes
  selected match attributes onto a draft listing.
- **Cache invalidation / hot purge endpoint.** TTL expiration only;
  manual purge is a follow-up if cache poisoning becomes a real risk.
- **Background cache warm / scheduled refresh.** Cache populates
  lazily on demand only.
- **Free-text fuzzy ranking** (Levenshtein, embedding-based). Fixture
  adapter does case-insensitive substring matching; richer ranking is
  the real-adapter's concern.
- **Cover image rehosting / proxy.** `coverThumbnailUrl` is whatever
  the adapter returns; Cloudflare Images variant generation for
  catalog covers is out of scope.
- **Per-user search rate limiting.** Cache absorbs duplicate queries;
  abuse mitigation lands when public traffic ramps in M2.

## REQ coverage

- **REQ-016** — Catalog-assisted listing (GCD). Endpoint + adapter
  pattern provide the prefill source the listing flow needs.
- **REQ-036** — Comics metadata source (GCD). Adapter interface is the
  swap point; fixture is the M1-POC implementation.

## Proposed ontology terms

- `catalog_adapter` — server-side abstraction over an external comics
  metadata source, conforming to a stable `search(query) →
  Promise<CatalogMatch[]>` interface. Default M1 implementation is
  `FixtureCatalogAdapter`; production swap target is GCD or Comic Vine
  once licensing is settled.
- `catalog_match` — a single issue/series result returned by a
  `catalog_adapter` search, carrying enough attributes to prefill a
  listing draft (series, issue number, variant, publisher, cover
  thumbnail). Identified by `catalogId` stable across requests.
- `catalog_search_cache` — Postgres-backed TTL cache that fronts the
  `catalog_adapter`. Keyed by SHA-256 of the normalized query; expires
  after `CATALOG_CACHE_TTL_DAYS` (default 30). Cache writes are
  best-effort and never fail the request.
- `degraded_response` — the contract by which the catalog-search
  endpoint returns `200 { matches: [], degraded: true }` instead of 5xx
  when the adapter fails. Preserves the manual-entry fallback path
  that REQ-016 explicitly requires.
- `query_normalization` — server-side canonicalization
  (lowercasing, whitespace collapse, trimming) applied before both
  adapter dispatch and cache-key derivation so equivalent user input
  produces a single cache entry.
