---
run_id: 2026-05-11-buyer-signup-profile
intent: |
  Stand up the U-Foundation-App-Shell (TypeScript Expo monorepo with bun, Clerk
  auth wiring, Expo Router navigation, and a base design system) and ship Story
  S-1.1: a Buyer can sign up with email or phone OTP and edit their profile on
  iOS, Android, and Web from a single Expo codebase.
acceptance_criteria:
  - id: AC-1
    text: |
      A TypeScript-strict Expo monorepo is initialized at the repo root, managed
      with bun, and builds cleanly for iOS, Android, and Web targets. `bun run
      typecheck`, `bun run lint`, and `bun run test` all exit 0 on a fresh
      checkout.
  - id: AC-2
    text: |
      Clerk is integrated as the auth provider. An unauthenticated visitor
      lands on a sign-in/up screen; signing up with a valid email address
      triggers an OTP email, and entering the OTP routes the user to an
      authenticated home shell. The flow works identically on iOS, Android,
      and Web from one codebase.
  - id: AC-3
    text: |
      The same sign-up screen supports phone-number sign-up. Submitting a
      valid US phone number triggers an SMS OTP, and the entered OTP
      completes sign-up and routes to the authenticated home shell —
      indistinguishable from the email path on success.
  - id: AC-4
    text: |
      End-to-end sign-up (input → OTP receipt → authenticated home) is
      measurable and verified by an automated test to complete within 90
      seconds on each target platform, satisfying REQ-013.
  - id: AC-5
    text: |
      An authenticated Buyer can navigate to an Account screen and edit
      display name, avatar, and notification preferences. On save, the
      values persist via Clerk user metadata (or the chosen profile store)
      and remain after sign-out / sign-in on any platform.
  - id: AC-6
    text: |
      Every interactive element on the sign-up flow and Account screen
      carries an accessible label — `accessibilityLabel` on native, ARIA
      label/role on web — and meets WCAG 2.1 AA contrast in the default
      and dark themes per the design system primitives.
  - id: AC-7
    text: |
      Auth and profile flows have automated coverage: unit tests for the
      Account form (validation, persistence call) and an integration test
      that exercises the email OTP sign-up path end-to-end against a Clerk
      test fixture. All tests run under `bun run test` in CI.
out_of_scope:
  - KYC and identity verification (covered by S-3.1; seller-only)
  - Stripe Connect Express onboarding
  - Listings, decks, swipe UI, marketplace browse
  - Seller and Admin (Editor) roles and screens beyond Buyer authentication
  - Push notification delivery (only the toggle in profile preferences is in scope; delivery wiring is later)
  - Backend API service (auth handled by Clerk; profile persistence via Clerk metadata for this story)
  - Production CI/CD pipelines beyond a local `bun run` script set
proposed_ontology_terms:
  - Buyer
  - App Shell
  - Account screen
  - OTP sign-up flow
  - Design system primitive
source:
  kind: issue
  ref: "1"
---

## Intent

Stand up the U-Foundation-App-Shell (TypeScript Expo monorepo with bun, Clerk
auth wiring, Expo Router navigation, and a base design system) and ship Story
S-1.1: a Buyer can sign up with email or phone OTP and edit their profile on
iOS, Android, and Web from a single Expo codebase.

## Acceptance Criteria

- **AC-1** — A TypeScript-strict Expo monorepo is initialized at the repo root,
  managed with bun, and builds cleanly for iOS, Android, and Web targets.
  `bun run typecheck`, `bun run lint`, and `bun run test` all exit 0 on a fresh
  checkout.
- **AC-2** — Clerk is integrated as the auth provider. An unauthenticated
  visitor lands on a sign-in/up screen; signing up with a valid email address
  triggers an OTP email, and entering the OTP routes the user to an
  authenticated home shell. The flow works identically on iOS, Android, and
  Web from one codebase.
- **AC-3** — The same sign-up screen supports phone-number sign-up. Submitting
  a valid US phone number triggers an SMS OTP, and the entered OTP completes
  sign-up and routes to the authenticated home shell — indistinguishable from
  the email path on success.
- **AC-4** — End-to-end sign-up (input → OTP receipt → authenticated home) is
  measurable and verified by an automated test to complete within 90 seconds
  on each target platform, satisfying REQ-013.
- **AC-5** — An authenticated Buyer can navigate to an Account screen and edit
  display name, avatar, and notification preferences. On save, the values
  persist via Clerk user metadata (or the chosen profile store) and remain
  after sign-out / sign-in on any platform.
- **AC-6** — Every interactive element on the sign-up flow and Account screen
  carries an accessible label — `accessibilityLabel` on native, ARIA
  label/role on web — and meets WCAG 2.1 AA contrast in the default and dark
  themes per the design system primitives.
- **AC-7** — Auth and profile flows have automated coverage: unit tests for
  the Account form (validation, persistence call) and an integration test that
  exercises the email OTP sign-up path end-to-end against a Clerk test
  fixture. All tests run under `bun run test` in CI.

## Out of Scope

- KYC and identity verification (covered by S-3.1; seller-only)
- Stripe Connect Express onboarding
- Listings, decks, swipe UI, marketplace browse
- Seller and Admin (Editor) roles and screens beyond Buyer authentication
- Push notification delivery (only the toggle in profile preferences is in scope; delivery wiring is later)
- Backend API service (auth handled by Clerk; profile persistence via Clerk metadata for this story)
- Production CI/CD pipelines beyond a local `bun run` script set

## Proposed Ontology Terms

- **Buyer** — Authenticated end-user persona that swipes, filters, and purchases. Authenticated via Clerk.
- **App Shell** — The cross-platform Expo project (iOS/Android/Web) that hosts every feature.
- **Account screen** — The authenticated profile-edit surface (display name, avatar, notification preferences).
- **OTP sign-up flow** — Sign-up path that begins with email or phone, completes via a one-time passcode.
- **Design system primitive** — Reusable, themed, accessible UI component shared across platforms.

## Source

- Issue: [#1](https://github.com/alxjrvs/slabd/issues/1) — *S-1.1 Buyer signs up and edits profile*
- Body SHA (captured): `1fab899ab0a05156ccd8c868a3d93b8103d1381a`
- Architecture reference: [`ideate/architecture.md`](../../../ideate/architecture.md) → Appendix A → S-1.1; Unit U-Foundation-App-Shell
- REQ-IDs traced: REQ-008, REQ-012, REQ-013, REQ-027, REQ-033
