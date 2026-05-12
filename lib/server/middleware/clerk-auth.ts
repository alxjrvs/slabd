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

    const claims = await verifyWithCacheAndRetry(token, fetchJwks);
    if (!claims) {
      return c.json({ error: "invalid_token" }, 401);
    }

    c.set("userId", claims.sub);
    c.set("email", claims.email);
    await next();
  };
}

// ---------------------------------------------------------------------------
// Verify with JWKS cache + single rotation retry
// ---------------------------------------------------------------------------

async function verifyWithCacheAndRetry(
  token: string,
  fetchJwks: () => Promise<JSONWebKeySet>,
): Promise<ClerkClaims | null> {
  // Warm the cache on first call.
  if (!cachedJwks) {
    try {
      cachedJwks = await fetchJwks();
    } catch (err) {
      logger.error("clerkAuth: failed to fetch JWKS", serializeError(err));
      return null;
    }
  }

  const result = await tryVerify(token, cachedJwks);
  if (result !== "kid_mismatch") {
    return result;
  }

  // `kid` mismatch signals key rotation: refetch once and retry.
  try {
    cachedJwks = await fetchJwks();
  } catch (err) {
    logger.error("clerkAuth: JWKS refetch failed after kid mismatch", serializeError(err));
    return null;
  }
  const retried = await tryVerify(token, cachedJwks);
  return retried === "kid_mismatch" ? null : retried;
}

/**
 * Attempt JWT verification against the provided JWKS.
 *
 * Returns:
 * - `ClerkClaims` on success
 * - `null` on verification failure (expired, wrong issuer, bad sig, …)
 * - `"kid_mismatch"` when the JWKS does not contain a key for the
 *   token's `kid` header (signals the caller to refetch)
 */
async function tryVerify(
  token: string,
  jwks: JSONWebKeySet,
): Promise<ClerkClaims | null | "kid_mismatch"> {
  const keySet = createLocalJWKSet(jwks);

  try {
    const { payload } = await jwtVerify<{ sub: string; email?: string }>(
      token,
      keySet,
    );

    const sub = payload.sub;
    const email = (payload as Record<string, unknown>)["email"];

    if (typeof sub !== "string" || typeof email !== "string") {
      return null;
    }

    return { sub, email };
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      // jose throws JWKSNoMatchingKey when no key matches the kid.
      if (err.code === "ERR_JWKS_NO_MATCHING_KEY") {
        return "kid_mismatch";
      }
    }
    // Any other jose error (expired, bad sig, malformed, …)
    return null;
  }
}

/** Exported for tests that need to reset the module-level JWKS cache. */
export function __resetJwksCacheForTests(): void {
  cachedJwks = null;
}
