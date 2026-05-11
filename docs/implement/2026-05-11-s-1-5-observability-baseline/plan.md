# Plan — S-1.5 Observability baseline

Phase 0 scope output. Decomposes the 5 ACs into 3 cycles, recorded here so
Phase 2 dispatches can be traced back to ACs.

## Cycle decomposition

### cycle-1 — Logger surface + lint guardrail (foundation)

**Covers:** AC-1 (logger surface), AC-2 (lint guardrail)

**Files (new):**
- `lib/logger.ts` — structured logger with `debug`/`info`/`warn`/`error` and
  `withCorrelationId(id)` scoping. Forwards severity to console transports
  in dev; supplies a registration hook (`registerSink`) consumed by cycle-2
  to attach the Sentry breadcrumb sink.
- `lib/__tests__/logger.test.ts` — correlation-ID propagation + severity
  routing + sink fan-out coverage.

**Files (modified):**
- `app/(auth)/sign-in.tsx`, `app/(auth)/sign-in-phone.tsx`,
  `app/(auth)/verify-email.tsx`, `app/(auth)/verify-phone.tsx`,
  `app/(app)/account.tsx`, `lib/token-cache.ts` — replace `console.error`
  / `console.warn` with `logger.error` / `logger.warn`.
- `eslint.config.mjs` (or `.eslintrc.*`) — add `no-console` rule on
  production globs, override-off for tests.

**Reads from:** none (foundation cycle).

### cycle-2 — Sentry init + release tagging + breadcrumb sink (AC-3, AC-4)

**Covers:** AC-3 (Sentry init + release tag), AC-4 (breadcrumb sink +
tokenCache rewrite — closes #38)

**Files (new):**
- `lib/observability/sentry.ts` — DSN-gated init wrapping
  `@sentry/react-native`. Exports `initSentry()` invoked from
  `app/_layout.tsx`. Tags `release` from `EXPO_BUILD_COMMIT_SHA` /
  `Constants.expoConfig?.extra.commitSha`, `dist` from
  `Updates.runtimeVersion`. Registers a logger sink that maps logger calls
  to `Sentry.addBreadcrumb`.
- `lib/observability/__tests__/sentry.test.ts` — no-op when DSN unset;
  release+dist propagation; breadcrumb shape.

**Files (modified):**
- `app/_layout.tsx` — call `initSentry()` once at root.
- `lib/token-cache.ts` — replace the `// TODO(S-1.5)` site with
  `logger.warn` carrying the `corrupt_token_cache` breadcrumb category
  (closes #38 path).
- `eas.json` — add Sentry source-map upload hook on production builds.
- `.env.example` — document `EXPO_PUBLIC_SENTRY_DSN` and
  `EXPO_PUBLIC_SENTRY_ENV`.
- `package.json` — `@sentry/react-native`.

**Reads from:** cycle-1 (`lib/logger.ts` registerSink API).

### cycle-3 — PostHog product-analytics surface (AC-5)

**Covers:** AC-5 (PostHog SDK + capture wrapper)

**Files (new):**
- `lib/analytics.ts` — `init()` + `capture(event, properties)` wrapper.
  Buffers calls before `init()` resolves and flushes them once the client
  is ready. No-op when `EXPO_PUBLIC_POSTHOG_KEY` is unset.
- `lib/__tests__/analytics.test.ts` — buffer-then-flush + no-op when
  unconfigured.

**Files (modified):**
- `app/_layout.tsx` — call `analytics.init()` once at root.
- `.env.example` — document `EXPO_PUBLIC_POSTHOG_KEY`,
  `EXPO_PUBLIC_POSTHOG_HOST`.
- `package.json` — `posthog-react-native`.

**Reads from:** cycle-1 (`lib/logger.ts` for analytics-side error
reporting).

## Dispatch order

Sequential on `run/2026-05-11-s-1-5-observability-baseline`: cycle-1 →
cycle-2 → cycle-3. Both downstream cycles read from cycle-1's logger API,
so Phase 1 worktree fan-out is skipped — sequential execution is simpler
and the diffs are small enough that parallel doesn't pay back its setup
cost.

## Test plan

- `bun run typecheck` — strict TS across all new modules.
- `bun run lint` — must pass with the new `no-console` rule active.
- `bun run test:ci` — adds logger/sentry/analytics test files; existing
  suite continues to pass.
- `bun run test:e2e` — no new e2e coverage (observability is non-visible);
  existing Playwright suite continues to pass.

## Out-of-scope reminders

- Datadog browser/mobile RUM, APM, SLO dashboards — M3.
- API-side correlation-ID middleware — depends on S-1.2/3/4.
- Sentry Replay / PostHog Session Recording — privacy review pending.
- Feature flags on PostHog — S-2 / experimentation milestone.
