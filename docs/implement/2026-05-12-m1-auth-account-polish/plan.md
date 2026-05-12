---
run_id: 2026-05-12-m1-auth-account-polish
phase: 0
---

# Plan — M1 auth/account polish

Seven independent fixes, one cycle each. Sequential execution on a single
run branch with per-cycle commits. No parallel worktrees (single-thread
implementation; the issues touch overlapping files like
`app/(app)/account.tsx` so serialization avoids merge conflicts anyway).

## Cycles

| Cycle | Issue | Files (primary) | Reads from |
|-------|-------|-----------------|------------|
| 1 | #31 sign-in → sign-up rename | `app/(auth)/sign-in*.tsx` + refs | router config, tests, e2e |
| 2 | #32 AuthUser discriminated type | `lib/auth/user.ts` (new) + account screen | `@clerk/clerk-expo` hooks |
| 3 | #33 tighten E.164 regex | `lib/identifier.ts` + tests | — |
| 4 | #34 fake-timer OTP resend test | `app/(auth)/__tests__/sign-up-phone.test.tsx` | sign-up-phone screen |
| 5 | #35 optimistic rollback on update reject | `app/(app)/account.tsx` + test | — |
| 6 | #36 HexColor branded type | `lib/theme.ts` | — |
| 7 | #37 await signOut + double-tap guard | `app/(app)/account.tsx` + test | router |

Dependencies: cycle 1 (rename) blocks cycle 4 (path of test file changes).
Cycle 5 and cycle 7 both touch `account.tsx`; cycle 2 also touches it.
Sequential order keeps each diff focused.
