# Cycle 2 — Sentry init + release tagging + breadcrumb sink

**Status:** complete
**ACs covered:** AC-3 (Sentry init + release tag), AC-4 (breadcrumb sink + tokenCache rewrite)
**Parent SHA:** c1dacd0 (cycle-1)
**Worker:** main thread

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-2",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done", "local_review:passed"],
  "artifacts_written": [
    "lib/observability/sentry.ts",
    "lib/observability/__tests__/sentry.test.ts",
    "app/_layout.tsx",
    "app.json",
    "eas.json",
    ".env.example",
    "package.json"
  ],
  "verifiable_evidence": {
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test:ci"
  },
  "acs_covered": ["AC-3", "AC-4"],
  "ac_test_evidence": [
    { "ac_id": "AC-3", "test_name": "buildSentryConfig (AC-3): tags release with EAS_BUILD_COMMIT_SHA and dist with EAS_BUILD_RUNTIME_VERSION" },
    { "ac_id": "AC-3", "test_name": "initSentry (AC-3): is a no-op when DSN is unset and returns false" },
    { "ac_id": "AC-4", "test_name": "Sentry breadcrumb sink (AC-4): uses breadcrumb_category from the log data when present" },
    { "ac_id": "AC-4", "test_name": "Sentry breadcrumb sink (AC-4): captures errors via Sentry.captureException when data.error is an Error" }
  ],
  "proposed_ontology_terms": ["release_tag", "dist_tag"],
  "error": null
}
```

## Change rationale

- **`lib/observability/sentry.ts`** — `buildSentryConfig(env)` reads
  `EXPO_PUBLIC_SENTRY_DSN`, tags `release = EAS_BUILD_COMMIT_SHA`,
  `dist = EAS_BUILD_RUNTIME_VERSION`, with `Constants.expoConfig`
  fallbacks for non-EAS runs. `initSentry(env)` is idempotent and a
  no-op when the DSN is unset. It registers a single logger sink that:
  - emits a Sentry breadcrumb for every info/warn/error (skips debug),
  - picks the breadcrumb `category` from `data.breadcrumb_category`,
    falling back to `data.flow`, falling back to `"app"`,
  - attaches the active `correlation_id` to breadcrumb data,
  - calls `Sentry.captureException()` on `error`-level records when
    `data.error` is an Error or serialized Error shape, otherwise
    `Sentry.captureMessage()`.
- **`lib/observability/__tests__/sentry.test.ts`** — 11 cases covering
  DSN no-op, release/dist propagation from EAS env + Constants fallback,
  idempotent init, breadcrumb level + category resolution (incl.
  scrubbing the `breadcrumb_category` key out of payload data), correlation
  ID attachment, and the `captureException` path.
- **`app/_layout.tsx`** — call `initSentry()` once at module import so
  Sentry is wired before any route renders. The call is a no-op without
  a DSN, preserving local dev behavior.
- **`app.json`** — registers `@sentry/react-native/expo` as an Expo
  plugin so EAS Build picks up bundle-ID / source-map configuration
  automatically.
- **`eas.json`** — sets `SENTRY_UPLOAD_SOURCEMAPS=1` on the `production`
  profile. The Sentry post-install hooks
  (`sentry-eas-build-on-success`, etc.) are present in `node_modules/.bin/`
  via `@sentry/react-native`'s package, so EAS auto-detects.
- **`.env.example`** — documents `EXPO_PUBLIC_SENTRY_DSN` +
  `EXPO_PUBLIC_SENTRY_ENV`.
- **`package.json`** — adds `@sentry/react-native@8.11.1`.

## AC evidence

- **AC-3:** `buildSentryConfig` is a pure function returning
  `{ dsn, release, dist, environment, ... }`. Tests assert
  `release === EAS_BUILD_COMMIT_SHA`, `dist === EAS_BUILD_RUNTIME_VERSION`,
  Constants fallback paths, and no-op when DSN absent. `initSentry()` is
  idempotent (tested) and gated.
- **AC-4:** Breadcrumb-sink tests assert the breadcrumb shape with
  `level`, `message`, `category`, and `data.correlation_id`. The
  `corrupt_token_cache` category from `lib/token-cache.ts` (migrated in
  cycle-1) is verified end-to-end. Error capture path covers both
  native `Error` instances and the `serializeError()` output shape.

## Why deferred

- **Source-map upload at unit-test time.** Per AC-3, source maps are an
  EAS Build concern. Local Jest cannot exercise that path; we
  configured the EAS hook but didn't write a CI test for upload.
- **Automatic crash capture beyond `captureException`.** Sentry's RN SDK
  catches uncaught JS errors and native crashes automatically once
  `Sentry.init` runs — no app code is required. Tests don't simulate a
  native crash; the SDK contract carries that load.
