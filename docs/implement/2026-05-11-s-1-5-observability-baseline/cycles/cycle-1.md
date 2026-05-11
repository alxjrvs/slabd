# Cycle 1 — Logger surface + lint guardrail

**Status:** complete
**ACs covered:** AC-1 (logger surface), AC-2 (lint guardrail)
**Parent SHA:** 1adad7e04330d2b05d06ebfe9fade54499cb0c28
**Worker:** main thread (sequential cycle, no worktree)

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-1",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done", "local_review:passed"],
  "artifacts_written": [
    "lib/logger.ts",
    "lib/__tests__/logger.test.ts",
    "lib/token-cache.ts",
    "app/(auth)/sign-in.tsx",
    "app/(auth)/sign-in-phone.tsx",
    "app/(auth)/verify-email.tsx",
    "app/(auth)/verify-phone.tsx",
    "app/(app)/account.tsx",
    "eslint.config.mjs"
  ],
  "verifiable_evidence": {
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test:ci"
  },
  "acs_covered": ["AC-1", "AC-2"],
  "ac_test_evidence": [
    { "ac_id": "AC-1", "test_name": "logger (AC-1): propagates the active correlation ID into emitted records" },
    { "ac_id": "AC-1", "test_name": "logger (AC-1): routes each severity to the matching console transport" },
    { "ac_id": "AC-2", "test_name": "bun run lint exits 0 after rule add; rule blocks console.* in app/** lib/** src/**" }
  ],
  "proposed_ontology_terms": ["correlation_id", "breadcrumb_category"],
  "error": null
}
```

## Change rationale

- **`lib/logger.ts`** — new structured logger module. Exposes
  `debug`/`info`/`warn`/`error`, `withCorrelationId(id, fn)` for scoped
  request IDs (nested + restored on exit), and `registerSink(fn)` so
  cycle-2 (Sentry) and future transports plug in without touching the
  module's public surface. Built-in `consoleSink` keeps dev visibility
  for free. `serializeError()` keeps error payloads structured.
- **`lib/__tests__/logger.test.ts`** — covers severity routing,
  correlation-ID propagation in nested scopes, sink fan-out +
  unregister, and isolation of a throwing sink so it cannot corrupt the
  caller path.
- **`lib/token-cache.ts`** — four `console.*` sites replaced with
  `logger.warn` / `logger.error`. The corrupt-data branch (issue #38
  follow-up path) carries `breadcrumb_category: "corrupt_token_cache"`
  so cycle-2's Sentry sink can route the breadcrumb. Existing token-cache
  tests pass unchanged because the logger's built-in `consoleSink` still
  emits to `console.error`/`console.warn`, which the tests already spy on.
- **`app/(auth)/*.tsx` + `app/(app)/account.tsx`** — five `console.error`
  sites in the auth and account screens replaced with `logger.error`,
  each tagged with a `flow` field (`auth.email.sign_in`,
  `auth.phone.sign_in`, `auth.email.verify`, `auth.phone.verify`,
  `account.update`) for future grouping in Sentry. The `// TODO(S-1.5):
  structured log to Sentry with the Clerk error code` comments are
  removed — they were placeholders pointing at this cycle.
- **`eslint.config.mjs`** — adds `no-console: "error"` scoped to
  `app/**`, `lib/**`, `src/**` production globs, with test files
  (`**/__tests__/**`, `**/*.test.*`, `**/*.spec.*`) and the logger
  module itself excluded. Verified via `bun run lint` exit 0.

## AC evidence

- **AC-1:** Logger module ships with all five entry points
  (`debug/info/warn/error/withCorrelationId`). Tests in
  `lib/__tests__/logger.test.ts` assert severity routing, correlation
  propagation, scoped nesting, fan-out, and error isolation.
- **AC-2:** ESLint config now blocks `console.*` in production source.
  The pre-existing nine production `console.*` sites were the
  "regression sample" — they would fail `bun run lint` under the new
  rule; cycle-1 migrated all of them and `bun run lint` exits 0.

## Why not what was deferred

- **Sentry breadcrumb emission** is cycle-2's work. The logger calls
  `breadcrumb_category` field is dormant data until cycle-2 registers
  the Sentry sink.
- **PostHog wiring** is cycle-3's work; the logger is shape-compatible.
