# Ontology updates — s-1-4-gcd-lookup

Proposed during `implement:define`. Merged into `docs/glossary/` at ship.

## New terms

- **`catalog_adapter`** — Server-side abstraction over an external
  comics-metadata source, conforming to a stable
  `search(query) → Promise<CatalogMatch[]>` interface. The architecture
  designates this as a swap point so the real GCD/Comic Vine wiring can
  be added once licensing is settled (REQ-036). Default M1
  implementation is `FixtureCatalogAdapter` reading from
  `lib/server/catalog/fixtures/issues.json`. Sibling-of-pattern to
  `ShippingAdapter`, `TaxAdapter`, `PaymentsAdapter` from the broader
  Adapter Pattern at External Boundaries policy.

- **`catalog_match`** — A single issue/series result returned by a
  `catalog_adapter` search. Carries `catalogId` (stable across requests
  for cache keying), `series`, `issueNumber`, optional `variant`,
  optional `publisher`, optional `publishedYear`, and optional
  `coverThumbnailUrl`. These attributes are the source of the
  listing-draft prefill the consumer (S-2.4) writes onto a draft row.

- **`catalog_search_cache`** — Postgres-backed TTL cache fronting the
  `catalog_adapter`. Keyed by SHA-256 of the normalized-query JSON
  (`query_key` PK), stores `payload` (JSONB), `created_at`, and
  `expires_at`. TTL configurable via `CATALOG_CACHE_TTL_DAYS` env var
  (default 30). Cache writes are best-effort: a write failure is
  logged via `logger.warn` + `serializeError` but does not fail the
  request. Indexed on `expires_at` for future sweep efficiency.

- **`degraded_response`** — The contract by which the catalog-search
  endpoint returns
  `200 { matches: [], cacheHit: false, degraded: true }` instead of a
  5xx when the upstream adapter fails (throw, malformed response,
  1.4s timeout). Preserves the manual-entry fallback path that REQ-016
  + the architecture's "GCD-fail fallback (manual entry path)"
  decision-point require. Distinct from `200 { matches: [] }` (a real
  empty result) by the `degraded: true` flag.

- **`query_normalization`** — Server-side canonicalization applied
  before both adapter dispatch and cache-key derivation. Lowercases,
  collapses whitespace, trims surrounding whitespace. Ensures that
  `"Amazing Spider-Man  #129  "` and `"amazing spider-man #129"` share
  a single `catalog_search_cache` entry.

## Refinements to existing terms

- **`listing_draft`** (future S-2.4): gains a `catalog_match_id` (=
  `catalogId`) reference when the seller selects a match. The match
  payload becomes the prefill seed for series/issueNumber/variant/
  cover thumbnail before the seller's manual overrides.

## Status

- Pending review at ship.
