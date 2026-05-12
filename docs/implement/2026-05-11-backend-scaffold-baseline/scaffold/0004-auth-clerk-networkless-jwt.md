# ADR-0004 — Auth: Clerk networkless JWT verification

**Status:** Accepted
**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline

## Context

Clerk is already wired on the client side (S-1.1 + S-1.5). The client
attaches Clerk session tokens to API requests; the API must verify them.

The naive approach — call `clerkClient.sessions.verifySession()` — issues
a network request to Clerk's API on every request. That's a latency tax
and a hard dependency on Clerk's availability for every protected route.

Clerk's documented best practice is **networkless verification**: fetch
the issuer's JWKS once at startup, cache it, and verify tokens locally
against the cached public key.

## Decision

Use `@clerk/backend`'s `verifyToken(token, { jwtKey })` for verification,
with JWKS cached in module scope (warm on first request, refreshed on
key-rotation signal via `kid` mismatch).

Implementation lives in `lib/server/middleware/clerk-auth.ts`:

```ts
import { verifyToken } from "@clerk/backend";

let jwksCache: Awaited<ReturnType<typeof fetchJwks>> | null = null;

export const clerkAuth = () => async (c, next) => {
  const token = c.req.header("authorization")?.replace(/^Bearer /, "");
  if (!token) return c.json({ error: "missing_token" }, 401);

  if (!jwksCache) jwksCache = await fetchJwks();

  try {
    const claims = await verifyToken(token, { jwtKey: jwksCache });
    c.set("userId", claims.sub);
    c.set("email", claims.email);
    await next();
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
};
```

JWKS is fetched from `${CLERK_FRONTEND_API}/.well-known/jwks.json` on
cold start. Cached for the lifetime of the worker instance. On a `kid`
mismatch (key rotation), refetch and retry once.

## Consequences

**Positive:**
- Zero network calls in the steady-state hot path.
- Verification latency: microseconds (asymmetric crypto only).
- Resilient to short Clerk outages (cached JWKS survives until rotation).

**Negative:**
- Stale cache risk on key rotation. Mitigated by the `kid` mismatch
  refetch. Clerk's rotation is rare (months) and signaled by the new
  `kid` in issued tokens, so the refetch happens lazily on the first
  post-rotation request.
- No revocation. JWTs are valid until expiry (5min for Clerk's default
  session tokens). For session invalidation we'd need either short
  expiries (current default is fine) or a revocation list — out of
  scope.

## Alternatives considered

**`clerkClient.authenticateRequest()` over network:** rejected. Latency
+ availability cost on every request.

**Self-rolled JWT verification with `jose`:** rejected. Clerk's
`@clerk/backend` handles edge cases (clock skew, claim shape, multi-
issuer support for dev/prod) we'd reinvent.

**Session cookie + DB lookup:** rejected. Wrong protocol for mobile;
also a network/DB hit per request.
