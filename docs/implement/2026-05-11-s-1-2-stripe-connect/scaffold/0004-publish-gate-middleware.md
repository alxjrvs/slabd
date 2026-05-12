# ADR 0004 — Publish gate as Hono middleware

**Status:** Accepted (2026-05-11)
**Context:** S-1.2 Stripe Connect Express seller onboarding (#3)

## Context

REQ-030 requires that a user cannot publish a listing until their
Stripe Connect onboarding is `complete`. S-1.2 implements only the
stub `POST /api/listings` (full CRUD lands in S-2.4), but the gate
must exist now so subsequent stories inherit it.

Options:

1. **Hono middleware factory `requireSellerOnboarded()`.** Returns a
   middleware that reads `seller_accounts` for `c.var.userId`, 403s
   on non-`complete`, otherwise `await next()`. Composed onto any
   write route that needs the gate.
2. **Inline check inside each handler.** Easy to forget; every
   listing-write handler duplicates the lookup + 403 shape.
3. **Hono route group with implicit middleware.** Mount all
   listing-write routes under a sub-app that pre-mounts the gate.
   Stricter (forgetting the gate is a routing error, not a missing
   line of code), but assumes our route layout settles on a single
   sub-app.

## Decision

Middleware factory (option 1). One reusable function:

```ts
export function requireSellerOnboarded(): MiddlewareHandler<{ Variables: AppVars }>
```

Mounted explicitly on each gated route. The response shape on failure
is locked:

```json
{ "error": "onboarding_required" }
```

with HTTP `403`.

## Consequences

**Positive:**

- Single source of truth for "what does 'onboarded' mean for write
  access" — only this middleware reads `onboarding_status` for
  authorization. Routes can't drift.
- Composable with `clerkAuth()`: gated routes simply chain
  `app.use("/api/listings", clerkAuth(), requireSellerOnboarded())`.
- Trivially unit-testable: feed it a mock `c.var.userId` and DB.

**Negative:**

- Forgetting to mount it on a new write route is a silent permission
  bug. Mitigated by an integration test in cycle-5 that confirms the
  stub `POST /api/listings` 403s for a `pending` seller and 200/204s
  for a `complete` one — the pattern is a hard reference for S-2.4.

## Implementation notes

- Lives at `lib/server/middleware/require-seller-onboarded.ts`.
- Reads `seller_accounts` once per request; no caching layer yet
  (acceptable until we measure a hotspot — Neon HTTP queries are
  sub-millisecond at this scale).
- Returns `403` on missing row (treats `not_started` as ungated) and
  on any status other than `complete`. The error code
  `"onboarding_required"` is the public API contract; the client UI
  routes off this code to the onboarding screen.

## Alternatives rejected

- **Inline checks (option 2):** drift-prone; rejected on principle.
- **Sub-app grouping (option 3):** premature — listing routes
  aren't a stable sub-app yet (search, browse, public reads will
  share the `/api/listings` prefix without needing the gate).
