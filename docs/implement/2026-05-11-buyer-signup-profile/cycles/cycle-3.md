# cycle-3 — app-shell-routing

**Status:** complete
**Covers:** AC-2 (auth state plumbing), AC-7 (route gating)
**Parent SHA:** `a2f9d86`

## RED → GREEN → REFACTOR

### RED
Two new test files asserting:

- `lib/__tests__/auth.test.tsx` — `useAuth()` starts `{ isLoaded: true,
  isSignedIn: false, user: null }`, `signIn()` flips signed-in + stores
  the identifier, `signOut()` clears the session. Renders via
  `renderHook` from `@testing-library/react-native` with an
  `AuthProvider` wrapper.
- `app/__tests__/routing.test.tsx` — three redirects:
  - root `app/index.tsx` → `/(auth)/sign-in` when unauthenticated
  - `(app)/_layout.tsx` → `/(auth)/sign-in` when unauthenticated
  - `(auth)/_layout.tsx` → renders its Stack (no redirect) when
    unauthenticated.

Both failed before the modules existed.

### GREEN
- `lib/auth.tsx` — `AuthProvider` + `useAuth()` with the cycle-4 contract
  pre-baked: `{ isLoaded, isSignedIn, user, signIn, signOut }`. Cycle-4
  will swap the stub for Clerk's `useAuth()` + `useUser()` while
  preserving this shape.
- `app/_layout.tsx` — now composes `ThemeProvider` ⟶ `AuthProvider` ⟶
  `<Slot />` so both contexts are available in every route group.
- `app/index.tsx` — redirect router; routes signed-out users to
  `/(auth)/sign-in` and signed-in users to `/(app)`.
- `app/(auth)/_layout.tsx` — Stack with `Redirect` to `/(app)` when
  signed in. Headers hidden.
- `app/(auth)/sign-in.tsx` — placeholder showing Slabd brand + tagline +
  "Sign in to start swiping rare comics." Replaced by real form in
  cycle-4.
- `app/(app)/_layout.tsx` — mirror gate: redirects signed-out users to
  `/(auth)/sign-in`.
- `app/(app)/index.tsx` — authenticated home; the brand smoke test
  follows it here.

### REFACTOR
- Cycle-1 smoke test `app/__tests__/index.test.tsx` now imports from
  `../(app)/index` rather than `../index` (which is now a redirect).
  Test text + expectations unchanged, so AC-1 evidence is preserved.
- `routing.test.tsx` mocks `expo-router`'s `Redirect`/`Stack`/`Slot` as
  thin RN host nodes. Tests assert on `testID` rather than navigator
  internals, so future expo-router version bumps don't shatter them.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS app/__tests__/routing.test.tsx
PASS lib/__tests__/auth.test.tsx
PASS components/ds/__tests__/Button.test.tsx
PASS components/ds/__tests__/Field.test.tsx
PASS app/__tests__/index.test.tsx
PASS components/ds/__tests__/Text.test.tsx

Test Suites: 6 passed, 6 total
Tests:       19 passed, 19 total
```

## Notes for next cycle

- Cycle-4 should keep `lib/auth.tsx`'s default-export interface stable
  but swap the implementation: wrap children in `<ClerkProvider>` and
  derive `{ isSignedIn, user }` from `useAuth()` + `useUser()` from
  `@clerk/clerk-expo`. The stub `signIn`/`signOut` callbacks will be
  replaced by Clerk's flow methods called from the sign-in screens.
- `(auth)/sign-in.tsx` is a placeholder; cycle-4 turns it into the
  email-OTP entry. Phone variant lands in cycle-5.
- The redirect tests use a mocked expo-router. The real navigator is
  exercised in cycle-7's Playwright E2E.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-3",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "lib/auth.tsx",
    "lib/__tests__/auth.test.tsx",
    "app/_layout.tsx",
    "app/index.tsx",
    "app/__tests__/index.test.tsx",
    "app/__tests__/routing.test.tsx",
    "app/(auth)/_layout.tsx",
    "app/(auth)/sign-in.tsx",
    "app/(app)/_layout.tsx",
    "app/(app)/index.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-2", "AC-7"],
  "ac_test_evidence": [
    { "ac_id": "AC-2", "test_name": "AC-2: starts unauthenticated once loaded" },
    { "ac_id": "AC-7", "test_name": "AC-7: app/index redirects unauthenticated users to (auth)/sign-in" }
  ],
  "proposed_ontology_terms": ["Auth Group", "App Group", "Auth Provider"],
  "tokens_used": null,
  "error": null
}
```
