# Scaffold context — 2026-05-11-buyer-signup-profile

This is a development-time briefing for any human or agent picking up
the run. Read it before touching cycles.

## What is this run?

The first implementation run on a greenfield repo. It scaffolds the
**U-Foundation-App-Shell** and ships **Story S-1.1** (Buyer sign-up via
email/phone OTP + editable profile) in a single PR.

## What exists today

- `ideate/` — PRD and Arc42 architecture (planning only)
- `docs/` — brand language and design specs
- `README.md` — top-level project pitch
- `.github/` — empty conventions placeholder
- **No source code, no `package.json`, no test stack.**

## What this run produces

A working TypeScript Expo project at the repo root:

```
app/                      # expo-router routes, auth + app layout groups
components/
  ds/                     # design system primitives
  account/                # profile-edit form components
lib/                      # theme, auth gate, profile helpers
tests/
  e2e/                    # playwright web e2e
.github/workflows/ci.yml  # typecheck + lint + test + e2e
.env.example              # Clerk publishable key placeholder
package.json
tsconfig.json
app.json
```

…plus per-cycle records under `docs/implement/2026-05-11-buyer-signup-profile/cycles/`.

## Stack

| Concern | Choice | Source |
|---|---|---|
| Language | TypeScript (strict) | user requirement |
| Package manager | bun | user preference / architecture |
| Platform | Expo (RN + Web) | architecture §3.3 |
| Router | Expo Router | architecture §6 |
| Auth | Clerk (`@clerk/clerk-expo`) | architecture §3 |
| Unit/integration test | Vitest | ADR 0005 |
| E2E test (web) | Playwright | ADR 0005 |
| Lint | ESLint flat config + Prettier | cycle-1 |

## Required environment

- `bun` ≥ 1.1
- Node ≥ 20 (for Expo CLI compatibility)
- A Clerk dashboard with **test mode** enabled
- Env vars at dev/test time:
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (test instance)
  - For CI: same as a repo secret

The well-known test OTP in Clerk test mode is `424242` — both unit and
e2e tests rely on it.

## Out of scope

- Backend API service
- Stripe Connect onboarding, KYC, listings, decks
- iOS/Android E2E in CI (manual smoke only this run)
- Sentry / Datadog wiring

## Human-in-the-loop checkpoints

Things the agent **cannot fully verify** unaided:

1. **Real OTP delivery** — verified via Clerk dashboard test mode + the
   `424242` shortcut. Beyond that, requires a human with a real inbox /
   phone.
2. **iOS / Android native flows** — agent runs `bun run web` for smoke;
   actual device runs need a human with Expo Go or a dev build.
3. **CI workflow execution** — agent commits the workflow but the first
   run on GitHub Actions needs a push to verify.

These are surfaced as remaining TODOs in `ship.md` at the end of the run.

## How to drop in mid-run

1. Read `manifest.yaml` — find `phase`.
2. Read the cycle files written so far in `cycles/`.
3. The journal (`journal.jsonl`) is the source of truth for what gates
   have closed.
4. Re-enter via `/implement:deliver --resume 2026-05-11-buyer-signup-profile`.
