---
schema_version: 1
run_id: 2026-05-12-m1-auth-account-polish
issues: [31, 32, 33, 34, 35, 36, 37]
---

# Intent — M1 auth/account polish batch

Close out the M1 follow-ups that fell out of PR #30 review. Seven independent
low-risk fixes bundled into one run with `pr_strategy: one` so they land
together against `main`.

## Acceptance criteria

- AC-1 (#31): Rename `app/(auth)/sign-in.tsx` → `sign-up.tsx` and
  `app/(auth)/sign-in-phone.tsx` → `sign-up-phone.tsx`. All route refs,
  `<Link>` hrefs, and tests/e2e specs follow the rename. Route group
  `(auth)` is unchanged. Typecheck + lint + tests pass.
- AC-2 (#32): Introduce `AuthUser` discriminated union
  `{ kind: 'signed-out' } | { kind: 'signed-in'; id; firstName; lastName; ... }`
  with a typed selector. Account screen + other consumers branch on the
  union; type-level test confirms touching `user.firstName` without
  narrowing fails to compile.
- AC-3 (#33): Tighten `E164_RE` in `lib/identifier.ts` to enforce 8–15
  total digits (no leading-zero country code). Table-driven boundary
  tests (7 reject, 8 accept, 15 accept, 16 reject) pass.
- AC-4 (#34): The OTP 90-second resend test uses fake timers
  (`jest.useFakeTimers()` + `advanceTimersByTime`) and is load-bearing:
  asserts resend disabled at t=0 and t=89s, enabled at t=90s, and no
  second `preparePhoneNumberVerification` call before the gate opens.
- AC-5 (#35): Account-screen `user.update` rejections roll back the
  optimistic field state via a pre-submit snapshot. A unit test confirms
  field values revert and a generic error appears when update rejects.
- AC-6 (#36): `lib/theme.ts` `Palette` fields are typed as the branded
  `HexColor` type. A `hex()` helper enforces `^#[0-9a-fA-F]{6}$` at
  runtime. TS rejects raw `string` assignment; runtime guard test
  rejects invalid hex.
- AC-7 (#37): `signOut()` in the account screen is `await`ed inside a
  try/catch. A pending guard prevents double-tap from firing twice.
  Router redirect happens only on resolve; on reject, the user stays
  put and a generic error appears.

## Out of scope

- Any new feature work, schema migration, or unrelated cleanup
- Refactors beyond what the seven issues call for
- Production-config gates or secret rotation

## Proposed ontology terms

- `AuthUser` (discriminated user-state union)
- `HexColor` (branded palette type)
- `optimistic-rollback` (snapshot + restore-on-reject pattern)
