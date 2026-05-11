# Plan — 2026-05-11-buyer-signup-profile

Produced by `implement:scope` (Phase 0). Decomposes the 7 ACs in
`intent.md` into a TDD cycle DAG. Each cycle is a self-contained
RED → GREEN → REFACTOR pass with a named file footprint.

## Targets recap

- **Intent:** Stand up U-Foundation-App-Shell (TypeScript Expo monorepo, Clerk,
  Expo Router, base design system) and ship S-1.1 (Buyer sign-up via email/phone
  OTP, editable Account screen) — iOS/Android/Web from a single codebase.
- **Acceptance criteria:** AC-1 … AC-7 (see `intent.md`).
- **Budget:** aggregate 16 cycles; planned 7; remediation reserve 9.
- **PR strategy:** `one` (single PR at end). Commits per cycle.
- **Mode:** `concurrent` capability available; this plan runs sequentially —
  cycle 1 emits the skeleton everything else depends on, so parallelism
  doesn't help on the first pass.

## Cycle DAG

```
cycle-1 (scaffold-foundation)
  ├── cycle-2 (design-system-primitives)
  └── cycle-3 (app-shell-routing)
        └── cycle-4 (clerk-email-otp)
              ├── cycle-5 (clerk-phone-otp)
              └── cycle-6 (account-screen)
                    └── cycle-7 (e2e-and-a11y)
```

Sequential execution. Phase 1 (worktrees) is skipped — single-thread.

## Cycles

### cycle-1 — scaffold-foundation
- **Covers:** AC-1
- **Reads from:** `intent.md`, `ideate/architecture.md` §3.3 (tech), §6 (build view)
- **Deps:** none
- **File paths (planned):**
  - `package.json` (bun workspace; Expo SDK 55+; React 19 / RN 0.77 line)
  - `tsconfig.json` (strict; baseUrl + paths for `~/`)
  - `app.json` (Expo config)
  - `babel.config.js`
  - `metro.config.js`
  - `.eslintrc.cjs` or `eslint.config.mjs` (flat config preferred)
  - `.prettierrc`
  - `vitest.config.ts` (or `jest.config.ts` — pick in cycle)
  - `app/_layout.tsx` (root layout — placeholder)
  - `app/index.tsx` (placeholder home)
  - `.gitignore`
  - `.env.example` (Clerk publishable key placeholder)
  - *(bun-generated lockfile is committed but not hand-edited)*
- **RED test:** `bun run typecheck && bun run lint && bun run test` must all exit 0; bare app must boot under `bun run web` (smoke-tested via a render assertion in vitest using `expo-router/testing-library`).
- **GREEN:** scaffold project so above passes.
- **Done when:** all scripts pass, `app/index.tsx` renders "Slabd".

### cycle-2 — design-system-primitives
- **Covers:** AC-1 (partial), AC-6 (foundation)
- **Reads from:** cycle-1 artifacts; `ideate/architecture.md` §3 (a11y note)
- **Deps:** cycle-1
- **File paths (planned):**
  - `components/ds/Text.tsx`
  - `components/ds/Button.tsx`
  - `components/ds/Field.tsx` (label + TextInput + error)
  - `components/ds/View.tsx` (themed Surface)
  - `components/ds/index.ts`
  - `lib/theme.ts` (light + dark palette; meets WCAG AA contrast)
  - `lib/theme-provider.tsx`
  - `components/ds/__tests__/Button.test.tsx`
  - `components/ds/__tests__/Field.test.tsx`
- **RED:** unit tests assert (a) accessible role/label on press target, (b) disabled state semantics, (c) themed color resolves from provider.
- **GREEN:** implement components + tokens; all tests pass.
- **Done when:** primitives exported; `Button`/`Field`/`Text`/`View` render under both themes; tests green.

### cycle-3 — app-shell-routing
- **Covers:** AC-1, AC-2 (routing scaffold)
- **Reads from:** cycle-1, cycle-2
- **Deps:** cycle-1, cycle-2
- **File paths (planned):**
  - `app/_layout.tsx` (root: ClerkProvider, ThemeProvider, navigation stack — Clerk wired in cycle-4)
  - `app/(auth)/_layout.tsx` (unauth stack; redirects authed users to `(app)`)
  - `app/(auth)/sign-up.tsx` (placeholder; real OTP in cycle-4)
  - `app/(app)/_layout.tsx` (authed stack; redirects unauthed users to `(auth)/sign-up`)
  - `app/(app)/index.tsx` (authed home placeholder: "Welcome, {name}")
  - `lib/auth.tsx` (auth gate hook — temporary local state; Clerk hookup in cycle-4)
  - `app/__tests__/routing.test.tsx`
- **RED:** test asserts a user with `isSignedIn=false` is routed to `(auth)/sign-up`; `isSignedIn=true` is routed to `(app)`.
- **GREEN:** Expo Router groups + redirect logic in `_layout`s.
- **Done when:** routing test passes; web smoke run shows the right tree.

### cycle-4 — clerk-email-otp
- **Covers:** AC-2, AC-4 (partial — email half of 90s timing)
- **Reads from:** cycles 1-3
- **Deps:** cycle-3
- **File paths (planned):**
  - `app/_layout.tsx` (replace stub auth with Clerk's `<ClerkProvider>` reading `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`)
  - `app/(auth)/sign-up.tsx` (email input → `useSignUp().create({ emailAddress })` → OTP code screen)
  - `app/(auth)/verify.tsx` (6-digit OTP input → `attemptEmailAddressVerification`)
  - `lib/auth.tsx` (replace stub with Clerk's `useAuth`/`useUser` hooks)
  - `app/__tests__/sign-up-email.test.tsx` (mocks Clerk client; asserts state transitions)
- **RED:** integration test against `@clerk/clerk-expo` test mode (mocked client): submitting email triggers OTP create; valid OTP triggers verification; isSignedIn flips true; routes to `(app)/index`.
- **GREEN:** Clerk wiring + screens.
- **Done when:** test passes; manual smoke (web) reaches the OTP screen and accepts a Clerk test code (test keys treat `424242` as always-valid).

### cycle-5 — clerk-phone-otp
- **Covers:** AC-3, AC-4 (phone half)
- **Reads from:** cycle-4
- **Deps:** cycle-4
- **File paths (planned):**
  - `app/(auth)/sign-up.tsx` (add identifier-type toggle: email | phone)
  - `app/(auth)/verify.tsx` (handle both flows)
  - `lib/identifier.ts` (input validation: email vs E.164 US)
  - `app/__tests__/sign-up-phone.test.tsx`
- **RED:** integration test asserts phone-number path: phone → SMS OTP → verify → authenticated home.
- **GREEN:** phone variant.
- **Done when:** both paths green; the screen does not regress on email.

### cycle-6 — account-screen
- **Covers:** AC-5
- **Reads from:** cycles 1-5
- **Deps:** cycle-4 (auth available)
- **File paths (planned):**
  - `app/(app)/account.tsx`
  - `components/account/AvatarPicker.tsx`
  - `components/account/NotificationPrefsForm.tsx`
  - `lib/profile.ts` (typed wrapper over `user.update({ unsafeMetadata })` for notification prefs; display name + avatar via Clerk's first-class fields)
  - `app/__tests__/account.test.tsx`
- **RED:** test: editing display name + saving calls `user.update({ firstName, ... })`; toggling a notification pref persists into `unsafeMetadata.notifications`; on remount, values rehydrate from Clerk.
- **GREEN:** form + persistence.
- **Done when:** test green; manual smoke: edit + reload → values stick.

### cycle-7 — e2e-and-a11y
- **Covers:** AC-4 (full 90s timing), AC-6, AC-7
- **Reads from:** all prior cycles
- **Deps:** cycle-5, cycle-6
- **File paths (planned):**
  - `tests/e2e/sign-up-email.e2e.ts` (Playwright against `bun run web`; measures wall clock; asserts < 90s)
  - `tests/e2e/setup.ts` (Clerk test-mode keys; `424242` OTP)
  - `lib/a11y.ts` (small helper enforcing `accessibilityLabel` || `aria-label` on interactive primitives via DS layer)
  - `components/ds/__tests__/a11y.test.tsx` (asserts every primitive forwards a11y props)
  - `.github/workflows/ci.yml` (typecheck + lint + test + e2e on PR)
- **RED:** Playwright run: open `/(auth)/sign-up` → email path → OTP → authed home, wall-clock < 90s.
- **GREEN:** any final wiring + the workflow file.
- **Done when:** unit + integration + e2e all green locally; workflow committed.

## Risk register

| Risk | Mitigation |
|------|-----------|
| Clerk publishable + secret keys required at dev/test | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.example`; tests use Clerk test mode keys; document key setup in `scaffold/README-context.md`. |
| OTP delivery is asynchronous — can't be observed deterministically in unit tests | Mock Clerk client in unit/integration; reserve actual delivery verification for the Playwright e2e against Clerk's test mode (which guarantees `424242` as valid OTP). |
| Expo Router + Clerk test-time setup is finicky on web vs native | Use `@clerk/clerk-expo`'s recommended bindings; smoke each cycle on `bun run web` (single platform) — full iOS/Android run is post-merge manual verification (called out in ship.md). |
| 90s timing test flaky in CI | Generous slack in assertion (e.g. `<60s` typical, `<90s` hard); single retry on flake; cap at hard fail to keep AC honest. |
| Greenfield scaffold churn could force later cycles to thrash | Cycle 1 fully owns project root; later cycles only add files in `app/`, `components/`, `lib/`, `tests/`. |

## What is NOT planned

- Backend API service (out of scope per intent)
- Stripe Connect, KYC, listings, decks, swipe surface
- iOS / Android device CI (web only in CI for v1; manual native verification noted in ship)
- Sentry / Datadog wiring (later milestone)
- Storybook (later; design system primitives are tested directly via vitest)
