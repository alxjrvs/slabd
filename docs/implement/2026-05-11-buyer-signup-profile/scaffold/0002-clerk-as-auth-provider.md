# ADR 0002 — Clerk as the auth provider for Buyer sign-up

**Status:** Accepted (2026-05-11)
**Run:** `2026-05-11-buyer-signup-profile`
**Context cycle:** cycle-4 (with stub gate in cycle-3)

## Context

Story S-1.1 requires email *and* phone OTP sign-up working on iOS, Android,
and Web from a single codebase, completing in under 90 seconds (REQ-013).
Architecture §1 and §3 lock in **Clerk** as the auth vendor.

## Decision

Use `@clerk/clerk-expo` for native + web. `ClerkProvider` wraps the root
layout. Sign-up uses Clerk's `useSignUp()` hook:

- Email path: `signUp.create({ emailAddress })` → `prepareEmailAddressVerification({ strategy: "email_code" })` → `attemptEmailAddressVerification({ code })`.
- Phone path: `signUp.create({ phoneNumber })` → `preparePhoneNumberVerification({ strategy: "phone_code" })` → `attemptPhoneNumberVerification({ code })`.

Both converge on `setActive({ session })` and route to `(app)`.

User profile fields (display name, avatar) use Clerk's first-class
`firstName`/`imageUrl`. Notification preferences (which Clerk has no
first-class slot for) ride on `unsafeMetadata.notifications: { email: bool,
push: bool, sms: bool }` — a thin typed wrapper lives in `lib/profile.ts`.

The `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` env var must be set at dev/test
time. A `.env.example` documents this. Tests use Clerk's test mode and
the well-known OTP `424242`.

## Consequences

- (+) Cross-platform OTP delivery handled by Clerk; no custom SMS/email
  infra in M1.
- (+) MFA, account recovery, and webhook-driven backend sync come for free
  in later milestones (PRD §3).
- (−) Adds a vendor dependency in cycle-4; partially mockable for unit
  tests but real verification needs the Clerk dashboard and test mode.
- (−) `unsafeMetadata` is writable from the client; for sensitive prefs
  later (e.g., payout settings) we'd switch to backend-set `publicMetadata`.
  Notification toggles are fine as `unsafeMetadata`.

## Alternatives considered

- **Auth.js (Next-Auth) on a separate backend** — explicitly off-table per
  architecture (no separate backend service in scope this run).
- **Supabase Auth** — viable, but architecture chose Clerk.
- **Roll our own OTP** — not in 90s budget.
