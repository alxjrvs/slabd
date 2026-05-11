# cycle-5 — clerk-phone-otp

**Status:** complete
**Covers:** AC-3 (phone sign-up), AC-4 (phone OTP half — completes AC-4)
**Parent SHA:** `f35d795`

## RED → GREEN → REFACTOR

### RED
Two new test files:

- `app/(auth)/__tests__/sign-in-phone.test.tsx`
  - Renders accessible phone field + "Send code" submit.
  - Rejects non-E.164 input (e.g. "555-not-a-phone") with a "country
    code" inline error and does NOT call Clerk.
  - On valid `+15555550101`, calls `signUp.create({ phoneNumber })`
    then `preparePhoneNumberVerification({ strategy: "phone_code" })`.
  - Routes to `/(auth)/verify-phone` with the phone number as a search
    param.
- `app/(auth)/__tests__/verify-phone.test.tsx`
  - Renders accessible code field + "Verify" submit.
  - Rejects codes that don't match `^\d{6}$`.
  - On `status: "complete"`, calls `setActive({ session: createdSessionId })`
    and `router.replace("/(app)")`.

Both failed before the screens existed.

### GREEN
- `lib/identifier.ts` — shared validators:
  - `EMAIL_RE`, `E164_RE`, `OTP_RE` plus `isValidEmail`,
    `isValidPhone`, `isValidOtp`.
  - `E164_RE = /^\+[1-9]\d{6,14}$/` — leading `+`, ITU max 15 digits
    after the country-code prefix, country code can't start with 0.
- `app/(auth)/sign-in-phone.tsx` — mirrors the email screen with
  `keyboardType=phone-pad`, `autoComplete=tel`, calls
  `create({ phoneNumber })` + `preparePhoneNumberVerification`.
- `app/(auth)/verify-phone.tsx` — mirrors the email-verify screen using
  `attemptPhoneNumberVerification`.

### REFACTOR
- Extracted `EMAIL_RE` / `OTP_RE` out of `sign-in.tsx` /
  `verify-email.tsx` into `lib/identifier.ts` so both auth pairs share
  one regex source.
- Added a "Use phone number instead" link on the email sign-in screen
  (Expo Router `<Link href="/(auth)/sign-in-phone" asChild>`). Symmetric
  link from phone → email can be added in cycle-7 polish if needed; not
  blocking AC-3.
- The phone verify reuses the email verify's error copy because the
  UX is identical from the user's perspective once they're on the
  code screen.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS app/(auth)/__tests__/sign-in-phone.test.tsx
PASS app/(auth)/__tests__/verify-phone.test.tsx
PASS app/(auth)/__tests__/verify-email.test.tsx
PASS app/(auth)/__tests__/sign-in.test.tsx
PASS components/ds/__tests__/Field.test.tsx
PASS components/ds/__tests__/Button.test.tsx
PASS components/ds/__tests__/Text.test.tsx
PASS lib/__tests__/auth.test.tsx
PASS app/__tests__/routing.test.tsx
PASS app/__tests__/index.test.tsx

Test Suites: 10 passed, 10 total
Tests:       35 passed, 35 total
```

## Notes for next cycle

- Cycle-6 (account screen) uses the same `useAuth()` adapter for
  signed-in user data — the email-or-phone identifier mapping is
  already covered by `lib/__tests__/auth.test.tsx`.
- Cycle-7's Playwright E2E should exercise both sign-in paths. Clerk's
  test mode supports a fixed OTP `424242` for `+15555550100` numbers
  (and a similar dev shortcut for emails) — wire those into the env at
  E2E time.
- A reverse link "Use email instead" from `sign-in-phone` → `sign-in`
  isn't strictly required by AC-3; if cycle-7 a11y review wants
  symmetry, add it then.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-5",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "lib/identifier.ts",
    "app/(auth)/sign-in-phone.tsx",
    "app/(auth)/verify-phone.tsx",
    "app/(auth)/__tests__/sign-in-phone.test.tsx",
    "app/(auth)/__tests__/verify-phone.test.tsx",
    "app/(auth)/sign-in.tsx",
    "app/(auth)/verify-email.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-3", "AC-4"],
  "ac_test_evidence": [
    { "ac_id": "AC-3", "test_name": "AC-3: starts the Clerk sign-up flow with the phone number and prepares OTP" },
    { "ac_id": "AC-4", "test_name": "AC-4: surfaces an error when the code is not 6 digits" }
  ],
  "proposed_ontology_terms": ["Phone Sign-Up", "E.164"],
  "tokens_used": null,
  "error": null
}
```
