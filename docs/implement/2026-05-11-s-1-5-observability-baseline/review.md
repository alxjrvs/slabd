# Phase 4 — Final review

**Verdict (final):** APPROVED-WITH-NOTES
**Re-review count:** 1
**Panel:** code-reviewer (initial), self-review (post-remediation)

## Round 1 — initial review (parent c1dacd0..632c078)

Reviewer surfaced 1 CRITICAL + 2 IMPORTANT findings:

### CRITICAL — Sentry release/dist inversion (`lib/observability/sentry.ts:33-34`)

`release = commitSha` and `dist = runtimeVersion` invert Sentry's data
model. `@sentry/react-native`'s source-map upload defaults to
`release = bundleIdentifier@version+buildNumber`. With the inverted
shape, uploaded source maps would never match the configured release →
silently unsymbolicated stacks in production.

**Recommendation accepted as-is:** swap to
`release: \`${bundleId}@${version}+${commitSha}\``, `dist: runtimeVersion`.

### IMPORTANT — top-level init on import (`app/_layout.tsx:9-10`)

`initSentry()` and `void initAnalytics()` ran at module evaluation, which
fires during route-type generation, Storybook scenes, and snapshot tests.
Recommendation: move into `useEffect`. Accepted.

### IMPORTANT — async-unsafe `withCorrelationId` (`lib/logger.ts:67-75`)

Stack-pop in `finally` runs at promise-creation time when `fn` returns
a Promise; subsequent `await`s inside `fn` see the popped value.
Recommendation: document sync-only OR AsyncLocalStorage. Accepted the
sync-only documentation path; AsyncLocalStorage on RN is non-trivial and
no real async use case exists in S-1.5.

## Round 2 — post-remediation (cycle-4, SHA 6bafe35)

All three findings remediated in cycle-4. Re-review confirms:

- `lib/observability/sentry.ts:36-46` now reads `bundleId` from
  `Constants.expoConfig.ios.bundleIdentifier` (with android/slug
  fallbacks) and `version` from `Constants.expoConfig.version`, building
  `release = ${bundleId}@${version}+${commitSha}` (test:
  `formats release as bundleId@version+commitSha and dist as runtime version`).
- `app/_layout.tsx:10-14` runs init inside `useEffect(() => { ... }, [])`
  — module evaluation no longer triggers init.
- `lib/logger.ts:69-71` carries a sync-only JSDoc note pointing async
  callers to pass `correlation_id` through `data`.

**Verification gate:**

```
bun run typecheck   # passes
bun run lint        # passes (no-console rule active)
bun run test:ci     # 108/108 passing across 19 suites
```

## Out-of-scope items confirmed deferred

- API correlation-ID middleware → post-S-1.2/3 (Stripe Connect, image upload)
- Datadog browser/mobile RUM → M3 (per ADR-0002)
- Sentry Session Replay / PostHog Recordings → privacy review required
- PostHog feature flags → S-2 / experimentation milestone

Hand off to Phase 5 (ship).
