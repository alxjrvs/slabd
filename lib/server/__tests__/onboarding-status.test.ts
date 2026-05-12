/**
 * Tests for lib/server/routes/onboarding-status.ts (AC-3)
 *
 * Pins:
 * - No row → synthesizes not_started + payoutsEnabled: false
 * - pending row passes through
 * - complete row passes through
 * - restricted row passes through
 */

import { Hono } from "hono";
import { onboardingStatusHandler } from "../routes/onboarding-status";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type MockSellerRow = { onboardingStatus: string; payoutsEnabled: boolean } | null;

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
  const db = buildMockDb(row) as NonNullable<
    Parameters<typeof onboardingStatusHandler>[0]
  >["db"];
  const app = new Hono<{ Variables: AppVars }>();

  // Inject userId as if clerkAuth() ran
  app.use("*", async (c, next) => {
    c.set("userId", "user_test_123");
    c.set("email", "test@example.com");
    await next();
  });

  app.get("/api/onboarding/status", onboardingStatusHandler({ db }));

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onboardingStatusHandler (AC-3)", () => {
  it("synthesizes not_started when no seller_accounts row exists", async () => {
    const app = buildApp(null);
    const res = await app.request("/api/onboarding/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ onboardingStatus: "not_started", payoutsEnabled: false });
  });

  it("passes through pending row", async () => {
    const app = buildApp({ onboardingStatus: "pending", payoutsEnabled: false });
    const res = await app.request("/api/onboarding/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ onboardingStatus: "pending", payoutsEnabled: false });
  });

  it("passes through complete row", async () => {
    const app = buildApp({ onboardingStatus: "complete", payoutsEnabled: true });
    const res = await app.request("/api/onboarding/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ onboardingStatus: "complete", payoutsEnabled: true });
  });

  it("passes through restricted row", async () => {
    const app = buildApp({ onboardingStatus: "restricted", payoutsEnabled: false });
    const res = await app.request("/api/onboarding/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ onboardingStatus: "restricted", payoutsEnabled: false });
  });
});
