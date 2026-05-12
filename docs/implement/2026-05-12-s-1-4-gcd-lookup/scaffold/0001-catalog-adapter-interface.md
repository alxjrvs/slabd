---
adr_id: 0001
title: CatalogAdapter swap-point interface + fixture default
status: accepted
date: 2026-05-12
---

# ADR-0001 — CatalogAdapter swap-point interface + fixture default

## Context

The architecture (`ideate/architecture.md` §"Adapter pattern at every
external boundary") prescribes `CatalogAdapter` as a swappable abstraction
over an external comics-metadata source. REQ-036 names GCD as the
primary candidate; the risk register notes licensing is unsettled and
explicitly designs the adapter to allow swap-in of an internal catalog
or Comic Vine.

S-1.4 needs to ship a working backend half — endpoint, cache, manual-
entry-preserving degradation — to unblock S-2.4 (listing draft + prefill)
without waiting on licensing.

## Decision

1. Define `CatalogAdapter` as a TypeScript interface in
   `lib/server/catalog/adapter.ts` with a single method:
   `search(query: CatalogQuery): Promise<CatalogMatch[]>`.
2. Ship a `FixtureCatalogAdapter` reading from
   `lib/server/catalog/fixtures/issues.json` as the M1-POC default.
3. The route's deps bag accepts `adapter: CatalogAdapter`; tests and
   future real-source wiring substitute via DI.
4. The real GCD/Comic Vine adapter is explicitly out of scope for this
   run and lives as a `TODO(S-1.4-followup)` marker.

## Consequences

- (+) Unblocks S-2.4 immediately; manual-entry path remains intact even
  if a future real adapter is flaky.
- (+) Adapter-interface tests act as the contract document for whoever
  writes the real adapter.
- (-) The fixture data is small and curated — search results will look
  identical between dev and CI. We accept this for M1 POC.
- (-) Anyone wiring real GCD later must update env-var-handling and the
  CI soft-warn alongside their work; documented inline in the adapter
  module.

## Alternatives considered

- **Hit Comic Vine directly with their public API.** Rejected for this
  run: real outbound HTTP and an API key obligation expand the
  observability surface and force webhook/idempotency tradeoffs that
  belong in a follow-up. The adapter pattern makes adding Comic Vine
  later a one-file change.
- **Embed adapter logic directly in the route.** Rejected: violates the
  Adapter Pattern at External Boundaries policy and makes the swap
  story (REQ-036 risk register) impossible.
