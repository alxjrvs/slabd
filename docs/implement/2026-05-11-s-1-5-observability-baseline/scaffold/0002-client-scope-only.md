# ADR-0002 — Client-scope-only observability for S-1.5

**Status:** Accepted, 2026-05-11
**Run:** 2026-05-11-s-1-5-observability-baseline (S-1.5)

## Context

Issue #5's Gherkin includes API-side scenarios — "Given any API request /
When it completes / Then a structured log with a correlation ID is
emitted" and "Datadog dashboards show p50/p95/p99 latency and error rate".
M1's backend does not yet exist. The next three M1 stories
(S-1.2 Stripe Connect, S-1.3 image upload, S-1.4 GCD catalog) are what
introduce server surface.

## Decision

Scope S-1.5 to the **client** half of the observability baseline only:

- Sentry (error + breadcrumb pipeline, release tagging).
- PostHog (product analytics).
- A correlation-ID-aware logger surface that is **shaped** to accept an
  API-supplied correlation ID, but reads from a client-side scope today.

The Datadog stack, API-request correlation-ID middleware, and SLO
dashboards are deferred to a follow-up after the API ships. This matches
the architecture's milestone phasing (Datadog SLO config is M3, per
`ideate/architecture.md`).

## Consequences

**Why this carve-out:**

- Sentry source-map upload, release tagging, and crash-free-session
  metrics depend only on client builds and EAS metadata. Shippable now.
- PostHog's value is product events, which the client emits. Server-side
  PostHog can be added without breaking the client surface.
- The logger's `withCorrelationId(id)` API is the contract that the API
  middleware will read into once it exists — no rework needed at that
  point, just one new sink and an `Inbound: x-correlation-id` reader.
- Issue #38 (tokenCache logging cleanup) is a real client-side path that
  benefits today; including it here closes its open thread without
  blocking on the API.

**Trade-off accepted:** issue #5's two Datadog acceptance lines are
documented as out-of-scope in `intent.md`, and a follow-up issue will be
filed at ship time to track the API/Datadog half explicitly.

## Alternatives considered

- **Wait for S-1.2/3/4 before any observability.** Rejected — the client
  is already collecting errors with `console.error`, and the longer the
  app runs uninstrumented, the more incidents we're blind to.
- **Stub the API surface now.** Rejected — building a Datadog APM
  integration against a non-existent service is anti-economy. The shape
  is well understood and can land in one focused follow-up run.
