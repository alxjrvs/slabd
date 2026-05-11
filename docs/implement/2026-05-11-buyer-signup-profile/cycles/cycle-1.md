# cycle-1 — scaffold-foundation

**Status:** complete
**Covers:** AC-1
**Parent SHA:** `6168545`

## RED → GREEN → REFACTOR

### RED
The cycle's failing state was the absence of every required project file
plus the smoke test `app/__tests__/index.test.tsx` asserting:

> AC-1: scaffold-boots — renders the Slabd brand header.

Before scaffolding, none of the three gate commands existed, let alone
exited 0.

### GREEN
- Hand-rolled an Expo SDK 55 project at the repo root:
  - `package.json` — Expo 55.0.23, React 19.2.6, React Native 0.85.3,
    Expo Router 55.0.14, Clerk SDK 2.19.31, jest-expo 55.0.17,
    `@react-native/jest-preset` 0.85.3, Playwright, prettier, eslint 9.39.4
    (eslint 10 is not yet supported by `eslint-plugin-react` transitively
    bundled in `eslint-config-expo@55`).
  - `tsconfig.json` — extends `expo/tsconfig.base`, strict, plus
    `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals/Parameters`,
    paths alias `~/* -> ./*`. `baseUrl` dropped because TypeScript 6.0
    deprecates it.
  - `app.json` — Expo config with `expo-router` plugin, new arch enabled,
    web bundler `metro`, scheme `slabd`.
  - `babel.config.js` — `babel-preset-expo` + Reanimated plugin.
  - `metro.config.js` — default Expo Metro config.
  - `eslint.config.mjs` — flat config extending `eslint-config-expo/flat`.
  - `.prettierrc` — semi, double quotes, trailing comma all, width 100.
  - `jest.config.js` — `jest-expo` preset, `setupFilesAfterEnv` (the
    correct Jest option name; my first pass had a typo), `watchman: false`
    (sandbox blocks `~/.local/state/watchman`).
  - `jest.polyfills.ts` + `jest.setup.ts` — `@testing-library/jest-native/extend-expect`.
  - `.gitignore`, `.env.example`, `expo-env.d.ts`.
- `app/_layout.tsx` — root Stack via Expo Router with `StatusBar`.
- `app/index.tsx` — minimal home rendering `Slabd` + tagline with
  `accessibilityRole="header"`.
- `app/__tests__/index.test.tsx` — render assertion for the header.

### REFACTOR
- Bumped `@types/react-dom` to `19.2.3` (latest published) since `19.2.14`
  did not exist on npm.
- Pinned `eslint-config-expo` to `^55.0.0` (was guessing `^9.0.0`).
- Removed a custom `transformIgnorePatterns` override that was masking
  jest-expo's preset defaults and re-causing the
  `expo-modules-core/src/...` parse failure.
- Added `react-test-renderer@19.2.6` as a dev dep — required by
  `@testing-library/react-native`'s peer check (without it, render()
  refuses to mount).
- Updated **ADR 0005** from Vitest to Jest + `jest-expo` because the
  Vitest path would have meant hand-rolling RN module resolution; the
  Expo preset handles it.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS app/__tests__/index.test.tsx
  Home screen (smoke test for AC-1)
    ✓ AC-1: scaffold-boots — renders the Slabd brand header

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

## Notes for next cycle

- The smoke test imports `@testing-library/react-native` synchronously
  and relies on jest-expo's transformer chain. That's the working pattern
  for every future component test.
- `bun run web` was not exercised in cycle-1 (Metro bundle in this sandbox
  is unreliable). Cycle-2's design-system tests should not require a
  Metro bundle either — pure render assertions work.
- Native (`bun run ios`/`android`) requires Xcode/Android Studio on the
  developer's machine; **not** verifiable from here.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-1",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "package.json",
    "tsconfig.json",
    "app.json",
    "babel.config.js",
    "metro.config.js",
    "eslint.config.mjs",
    ".prettierrc",
    "jest.config.js",
    "jest.polyfills.ts",
    "jest.setup.ts",
    ".gitignore",
    ".env.example",
    "expo-env.d.ts",
    "app/_layout.tsx",
    "app/index.tsx",
    "app/__tests__/index.test.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-1"],
  "ac_test_evidence": [
    { "ac_id": "AC-1", "test_name": "AC-1: scaffold-boots — renders the Slabd brand header" }
  ],
  "proposed_ontology_terms": ["App Shell"],
  "tokens_used": null,
  "error": null
}
```
