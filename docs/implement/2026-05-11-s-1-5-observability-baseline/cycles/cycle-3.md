# Cycle 3 — PostHog product-analytics surface

**Status:** complete
**ACs covered:** AC-5 (PostHog SDK + capture wrapper with pre-init buffering)
**Parent SHA:** fc49da3 (cycle-2)
**Worker:** main thread

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-3",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done", "local_review:passed"],
  "artifacts_written": [
    "lib/analytics.ts",
    "lib/__tests__/analytics.test.ts",
    "app/_layout.tsx",
    ".env.example",
    "package.json"
  ],
  "verifiable_evidence": {
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test:ci"
  },
  "acs_covered": ["AC-5"],
  "ac_test_evidence": [
    { "ac_id": "AC-5", "test_name": "analytics (AC-5): buffers capture() calls made before init() resolves and flushes on init" },
    { "ac_id": "AC-5", "test_name": "analytics (AC-5): is a no-op without EXPO_PUBLIC_POSTHOG_KEY" },
    { "ac_id": "AC-5", "test_name": "analytics (AC-5): forwards capture() calls directly once initialized" },
    { "ac_id": "AC-5", "test_name": "analytics (AC-5): only calls the factory once even when init() is invoked twice" }
  ],
  "proposed_ontology_terms": ["analytics_event_name"],
  "error": null
}
```

## Change rationale

- **`lib/analytics.ts`** — thin wrapper around `posthog-react-native`:
  - `init(options?, envOrFactory?)` is idempotent. Returns `null` when
    `EXPO_PUBLIC_POSTHOG_KEY` is unset (analytics is a complete no-op,
    and any buffered events are dropped — matching Sentry's DSN-gated
    behavior). The factory parameter is injected for tests so the real
    `PostHog` constructor (which touches storage and starts intervals)
    never runs in Jest.
  - `capture(event, properties)` buffers calls before init resolves and
    flushes them once the client is ready.
  - `identify(distinctId, properties)` forwards directly when the
    client is ready and is a no-op before (identity should be
    idempotent, so dropping pre-init identify calls is safe — the
    auth flow re-identifies after sign-in).
  - Errors from the factory are logged via `logger.error` with
    `breadcrumb_category: "analytics"` so they show up in Sentry, and
    the buffer is dropped to avoid retry loops.
- **`lib/__tests__/analytics.test.ts`** — six cases covering: no-op
  without key, buffer-then-flush, direct forwarding after init,
  idempotent init, identify gating, and the factory-throws path.
- **`app/_layout.tsx`** — adds `void initAnalytics()` at module import
  alongside `initSentry()`. Fire-and-forget is acceptable because
  `capture()` already buffers everything before init resolves.
- **`.env.example`** — documents `EXPO_PUBLIC_POSTHOG_KEY` and
  `EXPO_PUBLIC_POSTHOG_HOST`.
- **`package.json`** — adds `posthog-react-native@4.45.3`.

## AC evidence

- **AC-5:** PostHog SDK shipped via `posthog-react-native`, init gated by
  `EXPO_PUBLIC_POSTHOG_KEY` per the EXPO_PUBLIC_* convention. The
  `analytics.capture(event, properties)` wrapper at `lib/analytics.ts`
  buffers calls before init resolves and flushes them on init complete
  — proved by the `buffers capture() calls made before init() resolves
  and flushes on init` test.

## Out of scope held

- **Feature flags** — `posthog-react-native` exposes flag APIs but the
  wrapper doesn't expose them. S-2 / experimentation milestone owns the
  flag surface.
- **Session replay** — `enableSessionReplay` is left at default (off),
  pending privacy review.
- **Custom event taxonomy** — events are intentionally not pre-defined
  here. Each subsequent feature story emits its own analytics events
  through `capture()`.
