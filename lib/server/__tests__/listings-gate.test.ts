/**
 * Tests for AC-4 — Listing-publish gate behavior.
 *
 * Exercises the REAL `requireSellerOnboarded()` middleware composed with
 * the REAL `listingsStubHandler`. This proves the gate flips correctly
 * when DB state changes for the same fixture user, establishing the
 * integration pattern that cycle-5 inherits.
 *
 * clerkAuth() is skipped — userId is injected directly via middleware.
 */

import { Hono } from "hono";
import { requireSellerOnboarded } from "../middleware/require-seller-onboarded";
import { listingsStubHandler } from "../routes/listings-stub";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type MockSellerRow = { onboardingStatus: string } | null;

function buildMockDb(row: MockSellerRow) {
  return {
    select: () => ({
      from: () => ({
        where: (): Promise<MockSellerRow[]> => Promise.resolve(row ? [row] : []),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(row: MockSellerRow) {
  const mockDb = buildMockDb(row) as NonNullable<
    Parameters<typeof requireSellerOnboarded>[0]
  >["db"];

  const app = new Hono<{ Variables: AppVars }>();

  // Inject userId/email as if clerkAuth() ran
  app.use("*", async (c, next) => {
    c.set("userId", "user_test");
    c.set("email", "t@e.com");
    await next();
  });

  app.post(
    "/api/listings",
    requireSellerOnboarded({ db: mockDb }),
    listingsStubHandler,
  );

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listings publish gate (AC-4)", () => {
  it("returns 403 with onboarding_required when onboarding_status is pending", async () => {
    const app = buildApp({ onboardingStatus: "pending" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "onboarding_required" });
  });

  it("returns 204 and reaches listingsStubHandler when onboarding_status is complete", async () => {
    const app = buildApp({ onboardingStatus: "complete" });
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(204);
    // 204 No Content — body must be empty
    const text = await res.text();
    expect(text).toBe("");
  });

  it("returns 403 when no seller_accounts row exists (treats not_started as ungated)", async () => {
    const app = buildApp(null);
    const res = await app.request("/api/listings", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "onboarding_required" });
  });
});
