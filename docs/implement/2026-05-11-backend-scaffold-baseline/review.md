# Phase 4 — Final review

**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline
**SHA reviewed:** `a337d35`
**Reviewer:** `pr-review-toolkit:code-reviewer` (single-reviewer panel — this is a scaffold story, blast radius limited to a new code surface with no existing callers)
**Verdict:** `APPROVED-WITH-NOTES`

## CRITICAL

None.

## HIGH (file as follow-ups before S-1.2 ships)

### 1. Missing `iss` / `azp` claim validation in JWT verify

**Location:** `lib/server/middleware/clerk-auth.ts:167` — `jwtVerify(token, keySet)` is called without `issuer` or `audience` options.

**Risk:** Clerk's own JWT verification guidance requires checking `iss` (against the frontend API URL) and ideally `azp` (against allowed origins). Today's workaround is that Clerk JWKS is per-instance — a forged token from another Clerk app won't match the cached keys — but defense-in-depth requires explicit claim validation.

**Fix sketch:** Pass `{ issuer: frontendApi, algorithms: ["RS256"] }` into `jwtVerify`. Reject if `azp` is missing or not in an allowlist. Pin `algorithms` explicitly to close future algorithm-confusion risk if a non-RS key ever enters the JWKS.

### 2. JWKS refetch is unrate-limited; bogus `kid` is a DoS amplifier

**Location:** `lib/server/middleware/clerk-auth.ts:140-148` (the `kid_mismatch` refetch branch).

**Risk:** Any request carrying a token with an unknown `kid` triggers a network refetch against Clerk. An attacker sending tokens with random `kid` headers forces one upstream fetch per request.

**Fix sketch:** Add a cooldown (e.g., min 30s between refetches) or coalesce in-flight refetches via a single promise.

## Why ship anyway

- Per-instance JWKS isolates issuers; the `iss`/`azp` gap is defense-in-depth, not an active bypass.
- `/api/healthz` is unauthenticated, so the DoS amplification surface is limited to `/api/me` — which has no DB load, only JWT verify.
- This is the *scaffold*; no authenticated writes exist yet. Both items must be addressed before S-1.2 (Stripe Connect) lands — that's the first endpoint where a verification gap becomes load-bearing.

## Clean

- Schema (`drizzle/0000_glossy_vertigo.sql`) — safe migration; no locking concerns.
- Workers compatibility (`nodejs_compat` flag, `Buffer` use, lazy `process.env` reads).
- Route ordering — `clerkAuth()` is wired before the `me` handler; `c.var.userId` is only readable after auth runs.
- Secrets hygiene — `.env.example` uses `replace_me` placeholders.
- No console.* in production code.

## Follow-ups

Both HIGH items will be filed as separate issues against the new `U-Foundation-Backend` label and linked in the ship PR description. They block S-1.2 dispatch but not this scaffold's merge.
