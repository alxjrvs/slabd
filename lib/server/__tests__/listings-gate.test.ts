/**
 * Tests for AC-4 — Listing-publish gate behavior.
 *
 * Exercises the REAL `requireSellerOnboarded()` middleware composed with
 * the REAL `listingsDraftCreateHandler`. This proves the gate flips correctly
 * when DB state changes for the same fixture user, establishing the
 * integration pattern that cycle-5 inherits.
 *
 * clerkAuth() is skipped — userId is injected directly via middleware.
 */

import { Hono } from "hono";
import { requireSellerOnboarded } from "../middleware/require-seller-onboarded";
import { listingsDraftCreateHandler } from "../routes/listings-draft-create";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type MockSellerRow = { onboardingStatus: string } | null;

function buildMockSellerDb(row: MockSellerRow) {
  return {
    select: () => ({
      from: () => ({
        where: (): Promise<MockSellerRow[]> => Promise.resolve(row ? [row] : []),
      }),
    }),
  };
}

/** Minimal listings DB that records inserts without side effects. */
function buildMockListingsDb() {
  return {
    insert: () => ({
      values: () => Promise.resolve(undefined),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(row: MockSellerRow) {
  const mockSellerDb = buildMockSellerDb(row) as NonNullable<
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
    "/api/listings/draft",
    requireSellerOnboarded({ db: mockSellerDb }),
    listingsDraftCreateHandler({ db: buildMockListingsDb() as any }),
  );

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listings publish gate (AC-4)", () => {
  it("returns 403 with onboarding_required when onboarding_status is pending", async () => {
    const app = buildApp({ onboardingStatus: "pending" });
    const res = await app.request("/api/listings/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "onboarding_required" });
  });

  it("returns 201 and reaches listingsDraftCreateHandler when onboarding_status is complete", async () => {
    const app = buildApp({ onboardingStatus: "complete" });
    const res = await app.request("/api/listings/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(typeof body.id).toBe("string");
  });

  it("returns 403 when no seller_accounts row exists (treats not_started as ungated)", async () => {
    const app = buildApp(null);
    const res = await app.request("/api/listings/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "onboarding_required" });
  });
});
