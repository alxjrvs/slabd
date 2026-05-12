---
run_id: 2026-05-12-m1-auth-account-polish
phase: ship
pr_strategy: one
status: shipped
---

# Ship — M1 polish batch

## PR

- **#51** — https://github.com/alxjrvs/slabd/pull/51
- Base: `main`
- Head: `run/2026-05-12-m1-auth-account-polish`
- Title: `M1 polish: auth/account follow-ups (closes #31–#37)`
- Closes: #31, #32, #33, #34, #35, #36, #37

## Commits (8)

| SHA | Cycle | Issue | Subject |
|---|---|---|---|
| `8eab132` | 1 | #31 | chore(auth): rename sign-in screens to sign-up |
| `174d7d1` | 2 | #32 | feat(auth): AuthUser discriminated union with typed narrowing |
| `49679bf` | 3 | #33 | fix(identifier): tighten E.164 regex to enforce 8-15 digits |
| `1bd39d7` | 4 | #34 | feat(auth): 90s phone OTP resend gate with fake-timer regression test |
| `8517a8d` | 5 | #35 | feat(account): optimistic rollback when user.update rejects |
| `9a07473` | 6 | #36 | feat(theme): brand Palette fields as HexColor with validating constructor |
| `24f0022` | 7 | #37 | feat(account): await signOut with double-tap guard and error fallback |
| `9c80064` | rem | — | fix(auth+account): address Phase 4 review findings (M1 polish) |

## Phase 4 verdict

- Reviewers (3): code-reviewer, silent-failure-hunter, pr-test-analyzer
- Findings addressed in `9c80064`:
  - CRITICAL — `handleSignOut` left `signingOut: true` on success (stuck-button hazard); fixed by moving setState to `finally`.
  - MEDIUM — resend cooldown not restarted on failure (transient blip allows hammering Clerk); fixed by restarting cooldown in catch + regression test.
  - LOW — `flow: "auth.email.sign_in"` / `"auth.phone.sign_in"` drift on rename cycle 1; fixed to `sign_up`.
- Re-review (2): APPROVED on both.

## Test summary

- `bun run typecheck` — clean
- `bun run lint` — clean
- `bun run test:ci` — 301 passing (added 17 tests across cycles + remediation)
