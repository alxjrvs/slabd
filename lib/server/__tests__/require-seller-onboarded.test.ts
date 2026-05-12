/**
 * Tests for lib/server/middleware/require-seller-onboarded.ts
 *
 * Pins:
 * - 403 on no row (not_started synthesized)
 * - 403 on 'pending' status
 * - 403 on 'restricted' status
 * - next() called on 'complete' status
 */

import { Hono } from "hono";
import { requireSellerOnboarded } from "../middleware/require-seller-onboarded";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type MockSellerRow = { onboardingStatus: string } | null;

function buildMockDb(row: MockSellerRow) {
  return {
    select: () => ({
      from: () => ({
        where: (): MockSellerRow[] => (row ? [row] : []),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(row: MockSellerRow) {
  const db = buildMockDb(row) as NonNullable<Parameters<typeof requireSellerOnboarded>[0]>["db"];
  const app = new Hono<{ Variables: AppVars }>();

  // Inject userId as if clerkAuth() ran
  app.use("*", async (c, next) => {
    c.set("userId", "user_test_123");
    c.set("email", "test@example.com");
    await next();
  });

  app.post(
    "/api/listings",
    requireSellerOnboarded({ db }),
    (c) => c.body(null, 204),
  );

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireSellerOnboarded middleware", () => {
  it("returns 403 with onboarding_required when no seller_accounts row exists", async () => {
    const app = buildApp(null);
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "onboarding_required" });
  });

  it("returns 403 when onboarding_status is 'pending'", async () => {
    const app = buildApp({ onboardingStatus: "pending" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "onboarding_required" });
  });

  it("returns 403 when onboarding_status is 'restricted'", async () => {
    const app = buildApp({ onboardingStatus: "restricted" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "onboarding_required" });
  });

  it("calls next() and returns 204 when onboarding_status is 'complete'", async () => {
    const app = buildApp({ onboardingStatus: "complete" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(204);
  });

  it("returns 403 when onboarding_status is 'not_started' (defensive — should not be in DB)", async () => {
    // not_started should never be persisted, but guard defensively
    const app = buildApp({ onboardingStatus: "not_started" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("works without the db option (only verifies the factory returns a middleware function)", () => {
    // When called without options, the factory should return a middleware function.
    // We don't invoke it (would need live DB), just verify it's callable.
    const mw = requireSellerOnboarded();
    expect(typeof mw).toBe("function");
  });
});
