# ADR 0005 — Jest (via jest-expo) for unit + integration; Playwright for web E2E

> **Update (during cycle-1):** Originally proposed Vitest, but switched to
> Jest + `jest-expo` after dependency check. Vitest's Expo/RN module resolution
> is not first-class; `jest-expo` is the canonical Expo preset, handles
> Babel transformers, RN mocks, and `react-native-web` correctly out of the
> box. Rest of the strategy is unchanged.

**Status:** Accepted (2026-05-11)
**Run:** `2026-05-11-buyer-signup-profile`
**Context cycle:** cycle-1 (foundation) + cycle-7 (e2e)

## Context

AC-7 requires unit + integration coverage of auth and profile. AC-4
requires a verifiable end-to-end sign-up that completes in under 90
seconds. We need a test stack that:

- Runs fast in CI on every PR.
- Works with React Native + Web from one runner.
- Permits a real browser-driven E2E to measure wall-clock timing.

## Decision

- **Unit + integration:** Jest via the `jest-expo` preset, with
  `@testing-library/react-native` and `expo-router/testing-library`. Runs
  under the Expo-curated JSDOM-ish env. Single `bun run test` invocation.
- **E2E (web only for v1):** Playwright targeting `bun run web`. Headless
  Chromium. Wall-clock timing via `performance.now()` deltas captured
  inside the test.
- **Native E2E (Detox / Maestro):** explicitly out of scope for v1 — noted
  in `ship.md` as manual verification on a TestFlight build before any
  app-store submission.

## Consequences

- (+) One runner (Vitest) for the bulk of coverage — fast feedback locally.
- (+) Playwright integrates cleanly with Clerk's web bindings + test mode.
- (+) The 90s assertion is a single Playwright spec, easy to read and
  update.
- (−) Native (iOS/Android) coverage is currently smoke-only. Re-evaluate
  with Maestro once a second story lands that meaningfully diverges on
  native behavior.

## Alternatives considered

- **Jest** — historically the React Native default; works fine. Vitest
  is materially faster and has cleaner ESM/TS ergonomics.
- **Detox now** — disproportionate setup cost for a foundation story.
