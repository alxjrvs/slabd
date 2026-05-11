# ADR-0001 — Logger sink pattern

**Status:** Accepted, 2026-05-11
**Run:** 2026-05-11-s-1-5-observability-baseline (S-1.5)

## Context

S-1.5 lands three observability surfaces (Sentry, PostHog, eventual
Datadog) and replaces all production `console.*` usage with a structured
logger. There are two viable shapes:

1. **Logger-as-aggregator.** `lib/logger.ts` imports Sentry and PostHog
   directly and routes calls. Simple in the small.
2. **Logger-with-sinks.** `lib/logger.ts` owns the surface (severity,
   correlation-ID scoping). Concrete transports register themselves
   (`logger.registerSink(fn)`) and the logger fans out.

## Decision

Adopt **logger-with-sinks**.

## Consequences

**Why this shape:**

- The logger module has zero dependencies on Sentry/PostHog/Datadog
  packages. Cycle-1 ships entirely without touching those SDKs, which keeps
  the foundation cycle small and the dependency graph honest.
- Cycle-2 (`lib/observability/sentry.ts`) registers a Sentry breadcrumb
  sink at app init. Cycle-3 / future Datadog work registers its own sinks
  the same way. The logger's public API does not grow per-transport
  surface area.
- Tests can register a spy sink to assert severity/correlation propagation
  without mocking the underlying SDKs.
- When the API tier lands and `withCorrelationId()` needs to read from an
  HTTP context, the change is localized to the logger module — sinks
  receive an already-resolved context.

**Trade-off accepted:** one extra indirection at call time (`forEach` over
sinks). At observed call volumes this is invisible.

## Alternatives considered

- **Direct aggregator.** Cleanest call site, but forces every cycle that
  adds a transport to edit `lib/logger.ts`, and entangles the logger's
  test suite with three SDKs.
- **Per-surface loggers.** A `sentryLogger`/`posthogLogger`/`datadogLogger`
  triplet. Multiplies the consumer-side surface and re-creates the
  problem the structured logger was meant to solve.
