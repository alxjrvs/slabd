# Ontology updates — S-1.5 observability baseline

Terms proposed during this run, accreted across cycles 1–3.

| Term | Cycle | Use site | Definition |
|------|-------|----------|------------|
| `correlation_id` | 1 | `lib/logger.ts`, Sentry breadcrumb data | Per-flow request/trace identifier. Pushed onto `logger.withCorrelationId` for sync flows; passed explicitly via `data.correlation_id` for async flows. |
| `breadcrumb_category` | 1 | `lib/logger.ts` data, `lib/observability/sentry.ts` sink | Logger-side metadata key the Sentry sink reads to set `Sentry.addBreadcrumb.category`. Keeps the logger ignorant of Sentry semantics. |
| `release_tag` | 2 (refined in 4) | `lib/observability/sentry.ts` `buildSentryConfig` | Sentry release identifier. Format: `${bundleId}@${version}+${commitSha}`. Matches `@sentry/react-native`'s source-map upload default so symbolication artifacts resolve. |
| `dist_tag` | 2 | `lib/observability/sentry.ts` `buildSentryConfig` | Sentry dist identifier — runtime version. Distinguishes builds within a release. |
| `analytics_event_name` | 3 | `lib/analytics.ts` `capture(event, properties)` | First argument to PostHog `capture`. Each subsequent feature story defines its own event names; S-1.5 does not pre-define a taxonomy. |
