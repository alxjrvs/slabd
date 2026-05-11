# cycle-4 — clerk-email-otp

**Status:** complete
**Covers:** AC-2 (email sign-up), AC-4 (partial — email OTP), AC-6 (a11y)
**Parent SHA:** `48a3052`

## RED → GREEN → REFACTOR

### RED
Two new test files asserting Clerk-mocked behavior:

- `app/(auth)/__tests__/sign-in.test.tsx`
  - Renders an accessible email field + "Send code" button.
  - Rejects non-RFC-shape emails with an inline error and does NOT call
    Clerk's `signUp.create`.
  - On valid submit, calls `signUp.create({ emailAddress })` then
    `prepareEmailAddressVerification({ strategy: "email_code" })`.
  - Routes to `/(auth)/verify-email` with the email as a search param.
- `app/(auth)/__tests__/verify-email.test.tsx`
  - Renders an accessible "Verification code" field + "Verify" submit.
  - Rejects codes that don't match `^\d{6}$` and does NOT call Clerk.
  - On `status: "complete"`, calls `setActive({ session: createdSessionId })`
    and `router.replace("/(app)")`.
  - On non-complete status, surfaces an error and does NOT redirect.

Both failed before the screens existed.

### GREEN
- `lib/auth.tsx` — swapped the cycle-3 stub for a Clerk adapter:
  - `AuthProvider` wraps children in `<ClerkProvider publishableKey
    tokenCache>` (fails fast if the env var is missing).
  - `useAuth()` composes Clerk's `useAuth()` + `useUser()` and maps
    `user.primaryEmailAddress?.emailAddress ?? primaryPhoneNumber?.phoneNumber
    ?? user.id` into the existing `AuthUser` shape.
- `lib/token-cache.ts` — `expo-secure-store` adapter for Clerk's session
  JWT. Web falls through to no-op (SecureStore is native-only).
- `app/(auth)/sign-in.tsx` — fully implemented. Email field with
  `keyboardType=email-address`, `autoCapitalize=none`,
  `autoComplete=email`, RFC-shape regex validation before any Clerk
  call. Submit button shows loading spinner during the round-trip.
- `app/(auth)/verify-email.tsx` — 6-digit code field with
  `keyboardType=number-pad`, `autoComplete=one-time-code`, `maxLength=6`.
  Pulls the email from the search params for display copy. Activates
  the new Clerk session on success and routes to `/(app)`.
- `lib/__tests__/auth.test.tsx` — rewritten for the Clerk adapter.
  Tests cover loading state, email-identifier mapping, phone-identifier
  fallback (used by cycle-5), and signOut delegation.
- `app/__tests__/routing.test.tsx` — mocks `~/lib/auth` instead of
  building one through `<AuthProvider>` so the routing tests don't need
  the Clerk env var.

### REFACTOR
- Verify-email instruction copy changed from "6-digit code" to
  "verification code" so the error message ("Enter the 6-digit code …")
  can be asserted unambiguously in tests.
- Both screens normalize input — `email.trim()` and reuse the trimmed
  value for both the Clerk call AND the navigation param so the verify
  screen never sees a divergent string.
- All error paths reuse a single `error` slot in the Field — keeps the
  layout stable when an error appears.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS app/__tests__/routing.test.tsx
PASS app/__tests__/index.test.tsx
PASS lib/__tests__/auth.test.tsx
PASS components/ds/__tests__/Button.test.tsx
PASS components/ds/__tests__/Field.test.tsx
PASS app/(auth)/__tests__/sign-in.test.tsx
PASS components/ds/__tests__/Text.test.tsx
PASS app/(auth)/__tests__/verify-email.test.tsx

Test Suites: 8 passed, 8 total
Tests:       28 passed, 28 total
```

## Notes for next cycle

- The Clerk dashboard must enable **Email + Phone** identifiers for
  cycle-5 to share the same sign-up flow.
- `signUp.create({ phoneNumber })` mirrors the email path. Cycle-5 will
  add a `(auth)/sign-in-phone.tsx` (or branch within sign-in via tabs)
  and a `(auth)/verify-phone.tsx`. The `verify-email` screen is the
  template — copy + change `attemptEmailAddressVerification` →
  `attemptPhoneNumberVerification`.
- The Clerk adapter's `phoneNumber` fallback is already covered by
  `lib/__tests__/auth.test.tsx`'s AC-3 test, so cycle-5 doesn't need
  to revisit the adapter.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-4",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "lib/auth.tsx",
    "lib/token-cache.ts",
    "lib/__tests__/auth.test.tsx",
    "app/(auth)/sign-in.tsx",
    "app/(auth)/verify-email.tsx",
    "app/(auth)/__tests__/sign-in.test.tsx",
    "app/(auth)/__tests__/verify-email.test.tsx",
    "app/__tests__/routing.test.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-2", "AC-4"],
  "ac_test_evidence": [
    { "ac_id": "AC-2", "test_name": "AC-2: starts the Clerk sign-up flow with the email and prepares OTP" },
    { "ac_id": "AC-4", "test_name": "AC-4: surfaces an error when the code does not match the 6-digit shape" }
  ],
  "proposed_ontology_terms": ["Sign-Up Flow", "Verification Code", "Token Cache"],
  "tokens_used": null,
  "error": null
}
```
