/**
 * Clerk JWT auth middleware for Hono.
 *
 * Verifies Bearer tokens against a JSON Web Key Set (JWKS).  In
 * production the JWKS is fetched from Clerk's well-known endpoint and
 * cached for the lifetime of the module.  On a `kid` mismatch (Clerk
 * key rotation) the cache is invalidated and refetched once.
 *
 * The `fetchJwks` option exists solely for testing — pass in a factory
 * that returns an in-memory JWKS so no network traffic occurs in tests.
 * Production callers omit the option; the default fetcher hits Clerk.
 *
 * Security hardening:
 * - `iss` validated against CLERK_FRONTEND_API (when set).
 * - `algorithms` pinned to RS256 to prevent algorithm-confusion attacks.
 * - `azp` validated against CLERK_ALLOWED_AZP comma-separated allowlist
 *   (when set; unset means any azp is accepted — test-friendly default).
 * - JWKS refetch on kid_mismatch is rate-limited (30s cooldown) and
 *   concurrent refetches are coalesced into a single in-flight promise.
 */

import type { Context, MiddlewareHandler } from "hono";
import type { JSONWebKeySet } from "jose";
import { createLocalJWKSet, jwtVerify, errors as joseErrors } from "jose";

import { logger, serializeError } from "~/lib/logger";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Claims we extract from a verified Clerk JWT. */
interface ClerkClaims {
  sub: string;
  email: string;
}

export interface ClerkAuthOptions {
  /**
   * Injectable JWKS fetcher.  Defaults to the production Clerk endpoint.
   * Override in tests to provide an in-memory key set without network calls.
   */
  fetchJwks?: () => Promise<JSONWebKeySet>;
}

// ---------------------------------------------------------------------------
// Module-scoped JWKS cache (production path only)
// ---------------------------------------------------------------------------

let cachedJwks: JSONWebKeySet | null = null;

/** Timestamp (ms) of the last successful JWKS refetch on kid_mismatch. */
let lastRefetchAt = 0;

/** Minimum interval between kid_mismatch-triggered JWKS refetches (30s). */
const MIN_REFETCH_INTERVAL_MS = 30_000;

/**
 * In-flight promise for the initial JWKS warm fetch.  Concurrent callers
 * that all see `cachedJwks === null` share this instead of each launching
 * their own fetch.
 */
let warmInFlight: Promise<JSONWebKeySet | null> | null = null;

/**
 * In-flight refetch promise for kid_mismatch rotation.  If a refetch is
 * already underway, new concurrent callers await the same promise instead
 * of starting another fetch.  Cleared to null after the promise settles.
 */
let refetchInFlight: Promise<JSONWebKeySet | null> | null = null;

/**
 * Fetch the JWKS from Clerk's well-known endpoint.  Reads
 * `CLERK_FRONTEND_API` from the environment; falls back to
 * `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`-derived domain when available.
 * If neither is set, throws so the misconfiguration is surfaced early.
 */
async function fetchClerkJwks(): Promise<JSONWebKeySet> {
  const frontendApi =
    process.env.CLERK_FRONTEND_API ??
    // Derive domain from publishable key: pk_live_<base64(domain)> → decode
    deriveClerkFrontendApi(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!frontendApi) {
    throw new Error(
      "clerkAuth: CLERK_FRONTEND_API env var is required for production JWT verification",
    );
  }

  const url = `${frontendApi}/.well-known/jwks.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `clerkAuth: JWKS fetch failed — ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as JSONWebKeySet;
}

/**
 * Extract the frontend API domain from a Clerk publishable key.
 * Format: `pk_test_<base64>` or `pk_live_<base64>`.
 * Returns undefined if the key is absent or malformed.
 */
function deriveClerkFrontendApi(pk?: string): string | undefined {
  if (!pk) return undefined;
  try {
    const b64 = pk.replace(/^pk_(test|live)_/, "");
    const decoded = Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "");
    return `https://${decoded}`;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function clerkAuth(
  options: ClerkAuthOptions = {},
): MiddlewareHandler<{ Variables: AppVars }> {
  const { fetchJwks = fetchClerkJwks } = options;

  return async (c: Context<{ Variables: AppVars }>, next) => {
    const authHeader = c.req.header("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return c.json({ error: "missing_token" }, 401);
    }

    const result = await verifyWithCacheAndRetry(token, fetchJwks);
    if (result === null) {
      return c.json({ error: "invalid_token" }, 401);
    }
    if (result === "invalid_azp") {
      return c.json({ error: "invalid_azp" }, 401);
    }

    c.set("userId", result.sub);
    c.set("email", result.email);
    await next();
  };
}

// ---------------------------------------------------------------------------
// azp validation
// ---------------------------------------------------------------------------

/**
 * Validate the `azp` claim against `CLERK_ALLOWED_AZP`.
 *
 * Returns true (allow) when:
 * - CLERK_ALLOWED_AZP is unset (single-tenant / dev default)
 * - azp is present and in the comma-separated allowlist
 *
 * Returns false (reject) when CLERK_ALLOWED_AZP is set and:
 * - azp is absent from the token
 * - azp is not in the allowlist
 */
function isAzpAllowed(azp: unknown): boolean {
  const allowedRaw = process.env.CLERK_ALLOWED_AZP;
  if (!allowedRaw) {
    // No restriction configured — accept any azp.
    return true;
  }
  if (typeof azp !== "string" || azp.length === 0) {
    return false;
  }
  const allowList = allowedRaw.split(",").map((s) => s.trim());
  return allowList.includes(azp);
}

// ---------------------------------------------------------------------------
// Warm JWKS cache with coalescing
// ---------------------------------------------------------------------------

async function ensureJwksWarmed(
  fetchJwks: () => Promise<JSONWebKeySet>,
): Promise<JSONWebKeySet | null> {
  if (cachedJwks) return cachedJwks;

  if (!warmInFlight) {
    warmInFlight = fetchJwks()
      .then((jwks) => {
        cachedJwks = jwks;
        return jwks;
      })
      .catch((err) => {
        logger.error("clerkAuth: failed to fetch JWKS", serializeError(err));
        return null;
      })
      .finally(() => {
        warmInFlight = null;
      });
  }

  return warmInFlight;
}

// ---------------------------------------------------------------------------
// Verify with JWKS cache + single rotation retry
// ---------------------------------------------------------------------------

type VerifyResult = ClerkClaims | null | "invalid_azp";

async function verifyWithCacheAndRetry(
  token: string,
  fetchJwks: () => Promise<JSONWebKeySet>,
): Promise<VerifyResult> {
  const jwks = await ensureJwksWarmed(fetchJwks);
  if (!jwks) return null;

  const result = await tryVerify(token, jwks);
  if (result !== "kid_mismatch") {
    return result;
  }

  // `kid` mismatch signals key rotation: refetch (rate-limited) and retry.
  const now = Date.now();
  if (now < lastRefetchAt + MIN_REFETCH_INTERVAL_MS) {
    // Within cooldown window — skip refetch and reject this token.
    return null;
  }

  // Coalesce concurrent refetches into a single in-flight promise.
  if (!refetchInFlight) {
    refetchInFlight = fetchJwks()
      .then((refreshed) => {
        cachedJwks = refreshed;
        lastRefetchAt = Date.now();
        return refreshed;
      })
      .catch((err) => {
        logger.error(
          "clerkAuth: JWKS refetch failed after kid mismatch",
          serializeError(err),
        );
        return null;
      })
      .finally(() => {
        refetchInFlight = null;
      });
  }

  const refreshed = await refetchInFlight;
  if (!refreshed) {
    return null;
  }

  const retried = await tryVerify(token, refreshed);
  return retried === "kid_mismatch" ? null : retried;
}

/**
 * Attempt JWT verification against the provided JWKS.
 *
 * Returns:
 * - `ClerkClaims` on success (after azp check)
 * - `"invalid_azp"` when azp validation fails
 * - `null` on verification failure (expired, wrong issuer, bad sig, …)
 * - `"kid_mismatch"` when the JWKS does not contain a key for the
 *   token's `kid` header (signals the caller to refetch)
 */
async function tryVerify(
  token: string,
  jwks: JSONWebKeySet,
): Promise<ClerkClaims | null | "kid_mismatch" | "invalid_azp"> {
  const keySet = createLocalJWKSet(jwks);

  const issuer =
    process.env.CLERK_FRONTEND_API ??
    deriveClerkFrontendApi(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);

  try {
    const { payload } = await jwtVerify<{ sub: string; email?: string; azp?: string }>(
      token,
      keySet,
      {
        algorithms: ["RS256"],
        ...(issuer ? { issuer } : {}),
      },
    );

    const sub = payload.sub;
    const email = (payload as Record<string, unknown>)["email"];

    if (typeof sub !== "string" || typeof email !== "string") {
      return null;
    }

    if (!isAzpAllowed(payload.azp)) {
      return "invalid_azp";
    }

    return { sub, email };
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      // jose throws JWKSNoMatchingKey when no key matches the kid.
      if (err.code === "ERR_JWKS_NO_MATCHING_KEY") {
        return "kid_mismatch";
      }
    }
    // Any other jose error (expired, bad sig, malformed, wrong issuer, …)
    return null;
  }
}

/** Exported for tests that need to reset the module-level JWKS cache. */
export function __resetJwksCacheForTests(): void {
  cachedJwks = null;
  lastRefetchAt = 0;
  warmInFlight = null;
  refetchInFlight = null;
}
