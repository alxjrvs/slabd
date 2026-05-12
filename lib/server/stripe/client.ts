/**
 * Stripe client factory.
 *
 * Constructs a Stripe instance configured with `createFetchHttpClient()` so
 * the same client runs under both Node (Jest/Bun) and Cloudflare Workers.
 * Instances are memoized per secret key so callers share a single instance
 * per deployment context.
 *
 * Usage:
 *   import { getStripeClient } from "~/lib/server/stripe/client";
 *   const stripe = getStripeClient(env.STRIPE_SECRET_KEY);
 */

import Stripe from "stripe";

/**
 * Pinned Stripe API version. Update intentionally — never auto-upgrade.
 * Must match the LatestApiVersion exported by the installed `stripe` package.
 * Check https://stripe.com/docs/api/versioning for the latest GA version.
 */
export const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

/** Module-level memoization cache: secretKey → Stripe instance. */
const clientCache = new Map<string, Stripe>();

/**
 * Returns a memoized Stripe instance for the given secret key.
 * Uses `Stripe.createFetchHttpClient()` for Workers/Bun compatibility.
 */
export function getStripeClient(secretKey: string): Stripe {
  const cached = clientCache.get(secretKey);
  if (cached) return cached;

  const client = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: STRIPE_API_VERSION,
  });

  clientCache.set(secretKey, client);
  return client;
}

/**
 * Reset the memoization cache.
 * Exported for tests only — do not call in production code.
 */
export function __resetStripeClientCacheForTests(): void {
  clientCache.clear();
}
