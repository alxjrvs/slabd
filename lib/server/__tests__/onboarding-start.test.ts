/**
 * Tests for lib/server/routes/onboarding-start.ts
 *
 * Pins:
 * - Creates new Stripe account when no seller_accounts row exists
 * - Reuses existing stripe_account_id (no accounts.create call)
 * - Account Link is created with correct return_url + refresh_url
 * - Stripe SDK error propagates as 500
 */

import { Hono } from "hono";
import type Stripe from "stripe";
import { onboardingStartHandler, type OnboardingStartDeps } from "../routes/onboarding-start";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

type SellerRow = {
  userId: string;
  stripeAccountId: string | null;
  onboardingStatus: string;
  payoutsEnabled: boolean;
};

/**
 * Builds a minimal Drizzle-shaped mock db.
 *
 * `selectRows`    — rows returned by select().from().where()
 * `upsertCapture` — mutated by insert().values().onConflictDoUpdate() calls
 */
function buildMockDb(
  selectRows: SellerRow[],
  upsertCapture?: { calls: SellerRow[] },
) {
  return {
    select: () => ({
      from: () => ({
        where: (): SellerRow[] => selectRows,
      }),
    }),
    insert: (_table: unknown) => ({
      values: (data: SellerRow) => ({
        onConflictDoUpdate: (_opts: unknown): void => {
          upsertCapture?.calls.push(data);
        },
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock Stripe helpers
// ---------------------------------------------------------------------------

type MockStripe = Pick<Stripe, "accounts" | "accountLinks">;

function buildMockStripe(overrides: {
  accountCreate?: jest.Mock;
  accountLinksCreate?: jest.Mock;
}): MockStripe {
  return {
    accounts: {
      create: overrides.accountCreate ?? jest.fn(),
    } as unknown as Stripe["accounts"],
    accountLinks: {
      create: overrides.accountLinksCreate ?? jest.fn(),
    } as unknown as Stripe["accountLinks"],
  };
}

const DEFAULT_ACCOUNT_LINK = {
  url: "https://connect.stripe.com/setup/test/acct_test",
  expires_at: 1715900000,
};

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: OnboardingStartDeps) {
  const app = new Hono<{ Variables: AppVars }>();

  // Inject Clerk-like vars as if clerkAuth() ran
  app.use("*", async (c, next) => {
    c.set("userId", "user_test_123");
    c.set("email", "test@example.com");
    await next();
  });

  app.post("/api/onboarding/start", onboardingStartHandler(deps));

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onboardingStartHandler", () => {
  describe("Creates new Stripe account when none exists", () => {
    it("calls stripe.accounts.create, upserts the row, and returns 200 with url + expiresAt", async () => {
      const upsertCapture = { calls: [] as SellerRow[] };
      const db = buildMockDb([], upsertCapture);

      const accountCreate = jest.fn().mockResolvedValue({ id: "acct_test_new" });
      const accountLinksCreate = jest
        .fn()
        .mockResolvedValue(DEFAULT_ACCOUNT_LINK);

      const stripe = buildMockStripe({ accountCreate, accountLinksCreate });

      const app = buildApp({
        db: db as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      const res = await app.request("/api/onboarding/start", { method: "POST" });
      expect(res.status).toBe(200);

      const body = (await res.json()) as { url: string; expiresAt: number };
      expect(body.url).toBe(DEFAULT_ACCOUNT_LINK.url);
      expect(body.expiresAt).toBe(DEFAULT_ACCOUNT_LINK.expires_at);

      // stripe.accounts.create was called with correct params
      expect(accountCreate).toHaveBeenCalledTimes(1);
      expect(accountCreate).toHaveBeenCalledWith({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Row was upserted with new stripe account id and pending status
      expect(upsertCapture.calls).toHaveLength(1);
      expect(upsertCapture.calls[0]).toMatchObject({
        userId: "user_test_123",
        stripeAccountId: "acct_test_new",
        onboardingStatus: "pending",
        payoutsEnabled: false,
      });
    });
  });

  describe("Reuses existing Stripe account id", () => {
    it("does NOT call stripe.accounts.create; calls accountLinks.create with existing id", async () => {
      const existingRow: SellerRow = {
        userId: "user_test_123",
        stripeAccountId: "acct_test_existing",
        onboardingStatus: "pending",
        payoutsEnabled: false,
      };
      const db = buildMockDb([existingRow]);

      const accountCreate = jest.fn();
      const accountLinksCreate = jest
        .fn()
        .mockResolvedValue(DEFAULT_ACCOUNT_LINK);

      const stripe = buildMockStripe({ accountCreate, accountLinksCreate });

      const app = buildApp({
        db: db as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      const res = await app.request("/api/onboarding/start", { method: "POST" });
      expect(res.status).toBe(200);

      // accounts.create must NOT have been called
      expect(accountCreate).not.toHaveBeenCalled();

      // accountLinks.create must have been called with the existing account id
      expect(accountLinksCreate).toHaveBeenCalledTimes(1);
      expect(accountLinksCreate).toHaveBeenCalledWith(
        expect.objectContaining({ account: "acct_test_existing" }),
      );
    });
  });

  describe("Account Link wires return_url + refresh_url from EXPO_PUBLIC_APP_URL", () => {
    it("derives return_url and refresh_url from the env var", async () => {
      const existingRow: SellerRow = {
        userId: "user_test_123",
        stripeAccountId: "acct_url_test",
        onboardingStatus: "pending",
        payoutsEnabled: false,
      };
      const db = buildMockDb([existingRow]);

      const accountLinksCreate = jest
        .fn()
        .mockResolvedValue(DEFAULT_ACCOUNT_LINK);
      const stripe = buildMockStripe({ accountLinksCreate });

      const app = buildApp({
        db: db as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      await app.request("/api/onboarding/start", { method: "POST" });

      expect(accountLinksCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: "https://app.example.com/onboarding/return",
          refresh_url: "https://app.example.com/onboarding/refresh",
        }),
      );
    });
  });

  describe("DB insert throws after stripe.accounts.create succeeds (orphan account scenario)", () => {
    it("returns 500 with internal_error and stripe.accounts.create was already invoked", async () => {
      // accounts.create succeeds — a Stripe account now exists.
      // db.insert then throws — the orphan account is the failure mode this test pins.
      const accountCreate = jest
        .fn()
        .mockResolvedValue({ id: "acct_orphan_test" });
      const accountLinksCreate = jest.fn(); // should never be reached

      const stripe = buildMockStripe({ accountCreate, accountLinksCreate });

      const throwingDb = {
        select: () => ({
          from: () => ({
            where: (): [] => [],
          }),
        }),
        insert: (_table: unknown) => ({
          values: (_data: unknown) => ({
            onConflictDoUpdate: (_opts: unknown): never => {
              throw new Error("DB insert failed");
            },
          }),
        }),
      };

      const app = buildApp({
        db: throwingDb as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      const res = await app.request("/api/onboarding/start", { method: "POST" });
      expect(res.status).toBe(500);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");

      // Stripe account was created before the failure — proving the orphan exists
      expect(accountCreate).toHaveBeenCalledTimes(1);
      // accountLinks.create must NOT have been called
      expect(accountLinksCreate).not.toHaveBeenCalled();
    });
  });

  describe("Stripe SDK error propagates", () => {
    it("returns 500 when stripe.accountLinks.create throws", async () => {
      const existingRow: SellerRow = {
        userId: "user_test_123",
        stripeAccountId: "acct_error_test",
        onboardingStatus: "pending",
        payoutsEnabled: false,
      };
      const db = buildMockDb([existingRow]);

      const accountLinksCreate = jest
        .fn()
        .mockRejectedValue(new Error("Stripe network failure"));
      const stripe = buildMockStripe({ accountLinksCreate });

      const app = buildApp({
        db: db as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      const res = await app.request("/api/onboarding/start", { method: "POST" });
      expect(res.status).toBe(500);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("stripe_error");
    });

    it("returns 500 when stripe.accounts.create throws (new account path)", async () => {
      const db = buildMockDb([]);

      const accountCreate = jest
        .fn()
        .mockRejectedValue(new Error("Stripe accounts.create failed"));
      const stripe = buildMockStripe({ accountCreate });

      const app = buildApp({
        db: db as unknown as OnboardingStartDeps["db"],
        stripe,
        env: {
          STRIPE_SECRET_KEY: "sk_test_fake",
          EXPO_PUBLIC_APP_URL: "https://app.example.com",
        },
      });

      const res = await app.request("/api/onboarding/start", { method: "POST" });
      expect(res.status).toBe(500);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("stripe_error");
    });
  });
});
