# ADR 0003 — Expo Router grouped layouts for auth gating

**Status:** Accepted (2026-05-11)
**Run:** `2026-05-11-buyer-signup-profile`
**Context cycle:** cycle-3

## Context

The app has two top-level surfaces: unauthenticated (sign-up + verify)
and authenticated (home + account). We need a routing model that:

- Redirects unauth users into the sign-up group regardless of where they
  land.
- Redirects authed users out of the sign-up group.
- Composes cleanly with Clerk's `useAuth()`/`useUser()`.

## Decision

Use Expo Router's **route groups** (`(auth)` and `(app)`) with redirect
logic in each group's `_layout.tsx`:

```
app/
  _layout.tsx          # root: providers (Clerk, Theme), Stack root
  (auth)/
    _layout.tsx        # redirects to (app) when isSignedIn
    sign-up.tsx
    verify.tsx
  (app)/
    _layout.tsx        # redirects to (auth)/sign-up when !isSignedIn
    index.tsx          # authed home
    account.tsx        # profile edit
  index.tsx            # delegates to (auth) or (app)
```

The redirect is performed via `<Redirect href="..." />` returned from the
group `_layout`s based on `useAuth().isSignedIn`. While `isLoaded` is
false, a `<SplashView />` is rendered to avoid flashes.

## Consequences

- (+) The auth/unauth boundary is one redirect per layout — easy to read,
  easy to test.
- (+) New screens slot in without touching the gate logic.
- (+) Deep links route correctly because each layout enforces its own
  invariant.
- (−) Two layout files do redirects; reviewers should treat both as a
  pair when changing the rule.

## Alternatives considered

- **Single root layout with conditional rendering of children** — works,
  but breaks deep linking + URL fidelity on web.
- **Custom AuthGate HOC wrapping each screen** — repetition + drift risk.
