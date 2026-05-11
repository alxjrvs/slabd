# cycle-6 — account-screen

**Status:** complete
**Covers:** AC-5 (profile editing), AC-2 partial (sign out from account screen)
**Parent SHA:** `f4d5853`

## RED → GREEN → REFACTOR

### RED
`app/(app)/__tests__/account.test.tsx` — five tests:

- AC-6: accessible First/Last name fields + identifier visible.
- AC-5: fields pre-fill from `useUser().user.firstName/lastName`.
- AC-5: editing names and toggling a notification switch fires
  `user.update({ firstName, lastName, unsafeMetadata: { notifications } })`.
- AC-5: post-update "Saved" confirmation.
- AC-2: "Sign out" button delegates to `useClerk().signOut()`.

All five failed before `app/(app)/account.tsx` existed.

### GREEN
- `app/(app)/account.tsx` — ScrollView screen with:
  - `useUser()` for First/Last name + `primaryEmailAddress` / `primaryPhoneNumber`
  - notification toggles persisted in `user.unsafeMetadata.notifications`
    (`drops`, `messages` booleans; defaulted to `true` when absent)
  - `Save changes` button calling `user.update()` and surfacing a
    success/error message inline
  - `Sign out` via `useClerk().signOut()`
- `app/(app)/index.tsx` — added a "Profile" button that pushes
  `/(app)/account` so the new screen is reachable from the signed-in shell.

### REFACTOR
- Extracted `readPrefs()` parser to keep the metadata-shape coercion out
  of the render path.
- Test infrastructure:
  - `app/(app)/__tests__/account.test.tsx` uses `mockUseUser =
    jest.fn()` (rather than a `let currentUser` closure) because jest's
    `jest.mock()` factory only permits references to `mock`-prefixed
    module-scope identifiers.
  - Mocks `react-native/Libraries/Components/Switch/Switch` with a
    Pressable-backed stand-in (returned with `__esModule:true, default`)
    so the RN 0.85 codegen babel plugin doesn't trip over
    `AndroidSwitchNativeComponent`'s Flow types in jest.
  - `app/__tests__/index.test.tsx` mocks `expo-router` now that the home
    screen imports `useRouter` — keeps the smoke test free of the
    react-navigation/react-native-screens transitive that also runs
    afoul of RN 0.85's codegen.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS app/(app)/__tests__/account.test.tsx
PASS app/(auth)/__tests__/verify-email.test.tsx
PASS app/(auth)/__tests__/sign-in.test.tsx
PASS app/(auth)/__tests__/sign-in-phone.test.tsx
PASS app/(auth)/__tests__/verify-phone.test.tsx
PASS lib/__tests__/auth.test.tsx
PASS components/ds/__tests__/Button.test.tsx
PASS app/__tests__/routing.test.tsx
PASS components/ds/__tests__/Field.test.tsx
PASS app/__tests__/index.test.tsx
PASS components/ds/__tests__/Text.test.tsx

Test Suites: 11 passed, 11 total
Tests:       40 passed, 40 total
```

## Notes for next cycle

- Cycle-7 (Playwright e2e + a11y) should drive the full buyer flow:
  email or phone sign-up → OTP → home → account edit → sign-out.
  Clerk's test mode accepts `424242` as the OTP for fixture numbers
  (see cycle-5 note).
- The mocked Switch in this test file is jest-only. The real RN Switch
  ships unchanged to web/native.
- AC-2 (sign out) is satisfied here via the account screen. AC-7 (loading
  + error states across the whole flow) is still open for cycle-7's
  a11y/UX pass.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-6",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "app/(app)/account.tsx",
    "app/(app)/__tests__/account.test.tsx",
    "app/(app)/index.tsx",
    "app/__tests__/index.test.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-5", "AC-2"],
  "ac_test_evidence": [
    { "ac_id": "AC-5", "test_name": "AC-5: persists edited names + notification prefs via user.update()" },
    { "ac_id": "AC-2", "test_name": "AC-2: sign-out button invokes Clerk's signOut" }
  ],
  "proposed_ontology_terms": ["Notification Preferences"],
  "tokens_used": null,
  "error": null
}
```
