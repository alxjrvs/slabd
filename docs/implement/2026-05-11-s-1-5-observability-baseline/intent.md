---
run_id: 2026-05-11-s-1-5-observability-baseline
issue: 5
input_shape: issue
schema_version: 1
---

# Intent — S-1.5 Observability baseline (client scope)

**As a** Tech Lead
**I want** structured logs, errors, and product-analytics events from day one
**So that** we can diagnose issues without forensic archaeology once users start hitting the app

## Scope

Land the **client-side** observability baseline for the Expo app. M1's backend
does not yet exist, so the API-side Gherkin from issue #5 ("API request →
structured log with correlation ID", "Datadog dashboards p50/p95/p99") is
deferred to follow-up work after S-1.2 / S-1.3 / S-1.4 land the backend
surface. This run lands everything the client can ship now:

- **Sentry** SDK initialization with release tagging (EAS runtime version +
  commit SHA) and breadcrumb infrastructure.
- **PostHog** product-analytics SDK with a thin event-emission wrapper.
- **Structured logger** surface that replaces every production `console.*`
  call (including the `tokenCache` `// TODO(S-1.5)` hook from issue #38) and
  is correlation-ID-aware so it can extend cleanly when the API lands.
- **Lint rule** that prevents new `console.*` regressions in production code.

Datadog browser/mobile RUM is **out of scope** — it pairs with the API tier
and aligns with the architecture's M3 SLO-configuration milestone.

## Acceptance Criteria

- **AC-1 (logger surface):** A structured `logger` module exists at
  `lib/logger.ts` exporting `debug`/`info`/`warn`/`error` plus
  `withCorrelationId(id)` to scope a logical request. Every production
  `console.error` / `console.warn` in `app/**` and `lib/**` (including the
  five in `app/(auth)`, the one in `app/(app)/account.tsx`, and the four in
  `lib/token-cache.ts`) is replaced with the logger. Jest tests cover the
  correlation-ID propagation and severity routing.
- **AC-2 (lint guardrail):** ESLint configuration blocks `console.*` in
  production source (`app/**`, `lib/**`, `src/**` if/when added), with a
  scoped allowance for test files (`**/__tests__/**`, `**/*.test.*`). `bun
  run lint` fails on a regression sample and passes on the final tree.
- **AC-3 (Sentry init + release tag):** `@sentry/react-native` is wired at
  app root, gated by `EXPO_PUBLIC_SENTRY_DSN`, and tags every event with
  `release = <commit-sha>` and `dist = <eas-runtime-version>` derived from
  `Updates.runtimeVersion`/`process.env.EAS_BUILD_COMMIT_SHA`. When the DSN
  is unset (local dev), init is a no-op and the logger continues to work.
  Source-map upload is configured via the EAS Build hook in `eas.json` but
  not exercised at unit-test time.
- **AC-4 (Sentry breadcrumbs + tokenCache):** The logger emits a Sentry
  breadcrumb for every `info`/`warn`/`error` call when Sentry is
  initialized. The `tokenCache` `// TODO(S-1.5)` site in `lib/token-cache.ts`
  is rewritten to use `logger.warn` with a `corrupt_token_cache` breadcrumb
  category — closing the path that issue #38 was opened to track. A Jest
  test asserts the breadcrumb shape (category, level, data keys).
- **AC-5 (PostHog product-analytics surface):** `posthog-react-native` is
  initialized at app root, gated by `EXPO_PUBLIC_POSTHOG_KEY` (no-op when
  unset), and a thin `analytics.capture(event, properties)` wrapper exists
  at `lib/analytics.ts`. A Jest test asserts the wrapper buffers events
  before init resolves and flushes them on init complete.

## Out of scope

- API-side correlation-ID middleware (depends on backend that does not yet
  exist; tracked for a post-S-1.2/3/4 follow-up).
- Datadog browser/mobile RUM, APM, and SLO dashboards (M3 milestone per
  `ideate/architecture.md`).
- Feature-flag wiring on PostHog (S-2 / experimentation milestone).
- Replay / session-recording SDKs (Sentry Replay, PostHog Recordings) —
  privacy review pending.
- A user-visible "report a problem" UI (handled by S-1.8 / support story).

## Proposed ontology terms

- `correlation_id` — opaque ID propagated end-to-end through the logger
  surface, scoped via `withCorrelationId()`.
- `breadcrumb_category` — Sentry breadcrumb `category` strings emitted by
  the app (`corrupt_token_cache`, `auth_flow`, `account_update`, etc.).
- `release_tag` — the `release` Sentry field, value `<commit-sha>`.
- `dist_tag` — the `dist` Sentry field, value `<eas-runtime-version>`.
- `analytics_event_name` — snake-case verb-object string used as the first
  argument to `analytics.capture()`.

## Dependencies on other M1 stories

- None of the M1 backend stories block this run. When S-1.2 / S-1.3 / S-1.4
  ship the API, a follow-up will wire `withCorrelationId()` to the request
  ID header (`x-correlation-id`) and add Datadog browser SDK.

## Issue binding

- GitHub: alxjrvs/slabd#5
- Body SHA at intake: `987b7c6deecec5d2d2950d53955ed62de282381a`
