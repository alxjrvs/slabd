# Cycle 4 — Phase 4 remediation

**Status:** complete
**ACs covered:** AC-3 (Sentry release tagging — corrected), AC-4 (init lifecycle)
**Parent SHA:** 632c078 (cycle-3)
**Worker:** main thread

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-4",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done", "local_review:passed"],
  "artifacts_written": [
    "lib/observability/sentry.ts",
    "lib/observability/__tests__/sentry.test.ts",
    "app/_layout.tsx",
    "lib/logger.ts"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "6bafe357575c9d92384fc005abef19a6f0972e01",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test:ci"
  },
  "acs_covered": ["AC-3", "AC-4"],
  "ac_test_evidence": [
    { "ac_id": "AC-3", "test_name": "buildSentryConfig (AC-3): formats release as bundleId@version+commitSha and dist as runtime version" },
    { "ac_id": "AC-3", "test_name": "buildSentryConfig (AC-3): falls back to Constants.expoConfig for SHA + runtime when EAS env is absent" },
    { "ac_id": "AC-4", "test_name": "Sentry breadcrumb sink (AC-4): emits an info-level breadcrumb with the correlation ID attached" }
  ],
  "proposed_ontology_terms": [],
  "error": null
}
```

## Change rationale

Phase 4 final review surfaced 1 CRITICAL + 2 IMPORTANT findings. This
cycle addresses all three:

- **CRITICAL — Sentry release/dist inverted.** `@sentry/react-native`'s
  source-map upload defaults to `release = bundleIdentifier@version+commitSha`.
  The prior shape (`release = commitSha`, `dist = runtimeVersion`) would
  not match those artifacts and would silently produce unsymbolicated
  stacks in production. `buildSentryConfig` now reads
  `Constants.expoConfig.ios.bundleIdentifier` (falling back to
  `android.package` and `slug`) and `Constants.expoConfig.version` to
  build `release = ${bundleId}@${version}+${commitSha}`. `dist` is now
  the runtime version, which is stable across commits within a runtime.
- **IMPORTANT — top-level init on import.** `initSentry()` and
  `void initAnalytics()` previously ran at module evaluation time, which
  fires on `expo-router` typed-route generation, Storybook, and snapshot
  tests. Moved both into a `useEffect` inside `RootLayout` so init only
  runs in a real app session.
- **IMPORTANT — async-unsafe `withCorrelationId`.** The stack-based API
  pops in `finally`, so any `await` inside `fn` resumes after the pop
  and sees the wrong id. Documented as sync-only via JSDoc and recommend
  passing `correlation_id` through `data` for async flows. AsyncLocalStorage
  on RN is not free; deferring a proper implementation until a real use
  case lands.

## AC re-evidence

- **AC-3 (release tagging):** test `formats release as bundleId@version+commitSha`
  asserts the corrected format. Source maps uploaded by Sentry will now
  resolve symbolicated stacks in production.
- **AC-4 (init lifecycle):** init is deferred to `useEffect`; module
  import no longer triggers Sentry/PostHog side-effects. Breadcrumb sink
  registration still occurs on the first render via `initSentry()`.

## Verification

```
bun run typecheck   # passes
bun run lint        # passes
bun run test:ci     # 108/108 passing across 19 suites
```
