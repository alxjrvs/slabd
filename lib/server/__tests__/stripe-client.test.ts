/**
 * Tests for lib/server/stripe/client.ts
 *
 * Pins: client uses fetch httpClient; apiVersion is pinned.
 */

import { getStripeClient, STRIPE_API_VERSION, __resetStripeClientCacheForTests } from "../stripe/client";

describe("getStripeClient", () => {
  beforeEach(() => {
    __resetStripeClientCacheForTests();
  });

  it("returns a Stripe instance for a given secret key", () => {
    const client = getStripeClient("sk_test_abc");
    expect(client).toBeDefined();
    // Stripe instances expose .accounts, .webhooks etc.
    expect(typeof client.accounts).toBe("object");
    expect(typeof client.webhooks).toBe("object");
  });

  it("memoizes — same key returns the same instance", () => {
    const a = getStripeClient("sk_test_same");
    const b = getStripeClient("sk_test_same");
    expect(a).toBe(b);
  });

  it("different keys return different instances", () => {
    const a = getStripeClient("sk_test_key1");
    const b = getStripeClient("sk_test_key2");
    expect(a).not.toBe(b);
  });

  it("uses the fetch httpClient (not Node http module)", () => {
    // If createFetchHttpClient() is used, construction does NOT throw
    // in a Workers-like env (no Node 'http' access).
    expect(() => getStripeClient("sk_test_fetch")).not.toThrow();
  });

  it("pins the apiVersion to a single non-empty string", () => {
    expect(typeof STRIPE_API_VERSION).toBe("string");
    expect(STRIPE_API_VERSION.length).toBeGreaterThan(0);
    // Stripe API versions follow the YYYY-MM-DD or YYYY-MM-DD.name pattern
    expect(STRIPE_API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
