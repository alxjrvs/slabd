/**
 * End-to-end integration tests for the Stripe Connect onboarding flow.
 *
 * Exercises AC-1 through AC-4 as a chain using the real createApp()
 * factory with injected mocks (no network, no live DB).
 *
 * Uses Jest globals — do NOT import from bun:test.
 */

import crypto from "crypto";
import Stripe from "stripe";
import type { JSONWebKeySet } from "jose";

import { createApp, type CreateAppOptions } from "../app";
import { buildJwks, type JwksFixture } from "./_jwks-helpers";
import { __resetJwksCacheForTests } from "../middleware/clerk-auth";
import { STRIPE_API_VERSION } from "../stripe/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user_integration_test_1";
const TEST_STRIPE_ACCOUNT_ID = "acct_test_int";
const WEBHOOK_SECRET = "whsec_integration_test_dummy_secret_123";
const APP_URL = "https://app.example.com";

// ---------------------------------------------------------------------------
// HMAC signing helper (mirrors cycle-3 approach — Bun-safe)
// ---------------------------------------------------------------------------

function sign(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

// ---------------------------------------------------------------------------
// Stripe event payload builders
// ---------------------------------------------------------------------------

function buildAccountUpdatedPayload(
  accountId: string,
  overrides: {
    details_submitted?: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    disabled_reason?: string | null;
  } = {},
): string {
  const account: Record<string, unknown> = {
    id: accountId,
    object: "account",
    details_submitted: overrides.details_submitted ?? false,
    charges_enabled: overrides.charges_enabled ?? false,
    payouts_enabled: overrides.payouts_enabled ?? false,
    requirements: {
      disabled_reason: overrides.disabled_reason ?? null,
    },
  };

  const event = {
    id: `evt_integration_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: "event",
    type: "account.updated",
    data: { object: account },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: null,
    api_version: STRIPE_API_VERSION,
  };

  return JSON.stringify(event);
}

// ---------------------------------------------------------------------------
// In-memory DB mock
//
// Supports all four handlers:
//
//   onboarding-start:         select().from().where() — sync array
//                             insert(sellerAccounts).values().onConflictDoUpdate()
//
//   onboarding-status:        select().from().where() — sync array
//
//   require-seller-onboarded: select().from().where() — sync array
//
//   stripe-webhook:           select().from().where() — awaitable (returns plain array)
//                             update().set().where()
//                             insert(stripeWebhookEvents).values().onConflictDoNothing().returning()
//
// select() inspects the serialised condition to detect stripe_account_id vs
// user_id filters. Plain arrays satisfy both sync (rows[0]) and async
// (await Promise.resolve(array)) callers.
// ---------------------------------------------------------------------------

type SellerRow = {
  userId: string;
  stripeAccountId: string | null;
  onboardingStatus: string;
  payoutsEnabled: boolean;
};

function buildInMemoryDb(initial: SellerRow[] = []) {
  // Mutable in-memory store — keyed by userId.
  const store = new Map<string, SellerRow>();
  for (const row of initial) {
    store.set(row.userId, row);
  }

  // Track inserted idempotency event IDs.
  const insertedEventIds = new Set<string>();

  /**
   * Drizzle eq() produces a SQL AST with queryChunks[1] = column descriptor
   * (has a `.name` string like "user_id") and queryChunks[3] = bound param
   * descriptor (has a `.value` string).  Both indices are stable for a
   * two-argument eq() call.
   */
  type EqChunk = { name?: string; value?: unknown };
  type EqCondition = { queryChunks?: EqChunk[] };

  function extractColumnName(condition: unknown): string | undefined {
    const cond = condition as EqCondition;
    return typeof cond.queryChunks?.[1]?.name === "string"
      ? cond.queryChunks[1].name
      : undefined;
  }

  function extractCondValue(condition: unknown): string | undefined {
    const cond = condition as EqCondition;
    const val = cond.queryChunks?.[3]?.value;
    return typeof val === "string" && val !== "" ? val : undefined;
  }

  function isStripeAccountIdCondition(condition: unknown): boolean {
    const col = extractColumnName(condition);
    return col === "stripe_account_id";
  }

  const db = {
    /** Exposed for test assertions. */
    store,

    select: jest.fn().mockImplementation(() => ({
      from: jest.fn().mockImplementation((_table: unknown) => ({
        where: jest.fn().mockImplementation((condition: unknown) => {
          const value = extractCondValue(condition);

          let rows: SellerRow[];

          if (isStripeAccountIdCondition(condition)) {
            rows = value
              ? [...store.values()].filter((r) => r.stripeAccountId === value)
              : [];
          } else {
            // Filter by userId (default for all other eq() calls).
            rows = value
              ? [...store.values()].filter((r) => r.userId === value)
              : [...store.values()];
          }

          // Plain array: satisfies both rows[0] (sync) and await (async).
          return rows;
        }),
      })),
    })),

    insert: jest.fn().mockImplementation((_table: unknown) => {
      // Distinguish tables by checking for a known column property rather
      // than JSON.stringify (which fails on cyclic Drizzle table objects).
      // stripeWebhookEvents has an `eventId` column; sellerAccounts has `userId`.
      const isWebhookEvents =
        _table != null &&
        typeof _table === "object" &&
        "eventId" in (_table as Record<string, unknown>);

      if (isWebhookEvents) {
        // Idempotency insert path (stripe_webhook_events).
        return {
          values: jest
            .fn()
            .mockImplementation((data: { eventId: string }) => ({
              onConflictDoNothing: jest.fn().mockReturnValue({
                returning: jest
                  .fn()
                  .mockImplementation((_fields: unknown) => {
                    if (insertedEventIds.has(data.eventId)) {
                      return Promise.resolve([]);
                    }
                    insertedEventIds.add(data.eventId);
                    return Promise.resolve([{ eventId: data.eventId }]);
                  }),
              }),
            })),
        };
      }

      // seller_accounts upsert path (onboarding-start).
      return {
        values: jest
          .fn()
          .mockImplementation(
            (data: {
              userId: string;
              stripeAccountId: string;
              onboardingStatus: string;
              payoutsEnabled: boolean;
            }) => ({
              onConflictDoUpdate: jest
                .fn()
                .mockImplementation(
                  (_opts: {
                    target: unknown;
                    set: {
                      stripeAccountId: string;
                      onboardingStatus: string;
                      payoutsEnabled: boolean;
                    };
                  }) => {
                    store.set(data.userId, {
                      userId: data.userId,
                      stripeAccountId:
                        _opts.set.stripeAccountId ?? data.stripeAccountId,
                      onboardingStatus:
                        _opts.set.onboardingStatus ?? data.onboardingStatus,
                      payoutsEnabled:
                        _opts.set.payoutsEnabled ?? data.payoutsEnabled,
                    });
                    return Promise.resolve(undefined);
                  },
                ),
            }),
          ),
      };
    }),

    update: jest.fn().mockImplementation((_table: unknown) => ({
      set: jest
        .fn()
        .mockImplementation(
          (values: {
            onboardingStatus: string;
            payoutsEnabled: boolean;
            updatedAt: Date;
          }) => ({
            where: jest
              .fn()
              .mockImplementation((condition: unknown) => {
                const targetId = extractCondValue(condition);
                if (targetId) {
                  for (const [userId, row] of store.entries()) {
                    if (row.stripeAccountId === targetId) {
                      store.set(userId, {
                        ...row,
                        onboardingStatus: values.onboardingStatus,
                        payoutsEnabled: values.payoutsEnabled,
                      });
                      break;
                    }
                  }
                }
                return Promise.resolve(undefined);
              }),
          }),
        ),
    })),
  };

  return db;
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

async function buildTestJwt(
  fixture: JwksFixture,
  userId: string,
): Promise<string> {
  return fixture.signJwt({ sub: userId, email: `${userId}@test.example.com` });
}

// ---------------------------------------------------------------------------
// Mock Stripe factory
// ---------------------------------------------------------------------------

function buildMockStripe(accountId: string) {
  const realStripe = new Stripe("sk_test_anything", {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: STRIPE_API_VERSION,
  });

  return {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: accountId }),
    } as unknown as Stripe["accounts"],
    accountLinks: {
      create: jest.fn().mockResolvedValue({
        url: `https://connect.stripe.com/setup/test/${accountId}`,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    } as unknown as Stripe["accountLinks"],
    webhooks: realStripe.webhooks,
  };
}

// ---------------------------------------------------------------------------
// beforeEach — reset JWKS cache to prevent test bleed
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetJwksCacheForTests();
});

// ---------------------------------------------------------------------------
// Test 1: Full AC-1 → AC-4 chain
// ---------------------------------------------------------------------------

it("AC-1→AC-4 chain: start → gate closed → webhook → status complete → gate open", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(
    async (): Promise<JSONWebKeySet> => jwksFixture.jwks,
  );

  const mockStripe = buildMockStripe(TEST_STRIPE_ACCOUNT_ID);
  const db = buildInMemoryDb();

  const anyDb = db as any;

  const appOptions: CreateAppOptions = {
    fetchJwks,
    onboardingStartDeps: {
      db: anyDb,
      stripe: mockStripe,
      env: {
        STRIPE_SECRET_KEY: "sk_test_fake",
        EXPO_PUBLIC_APP_URL: APP_URL,
      },
    },
    onboardingStatusDeps: {
      db: anyDb,
    },
    stripeWebhookDeps: {
      db: anyDb,
      stripe: mockStripe as unknown as Stripe,
      env: { STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET },
    },
    requireSellerOnboardedOptions: {
      db: anyDb,
    },
  };

  const app = createApp(appOptions);

  const jwt = await buildTestJwt(jwksFixture, TEST_USER_ID);
  const authHeader = `Bearer ${jwt}`;

  // -------------------------------------------------------------------------
  // Step 1 — AC-1: POST /api/onboarding/start
  // -------------------------------------------------------------------------

  const startRes = await app.request("/api/onboarding/start", {
    method: "POST",
    headers: { Authorization: authHeader },
  });

  expect(startRes.status).toBe(200);

  const startBody = (await startRes.json()) as {
    url: string;
    expiresAt: number;
  };
  expect(startBody.url).toBe(
    `https://connect.stripe.com/setup/test/${TEST_STRIPE_ACCOUNT_ID}`,
  );

  // DB must have the seller_accounts row with stripe_account_id and status pending.
  const rowAfterStart = db.store.get(TEST_USER_ID);
  expect(rowAfterStart).toBeDefined();
  expect(rowAfterStart?.stripeAccountId).toBe(TEST_STRIPE_ACCOUNT_ID);
  expect(rowAfterStart?.onboardingStatus).toBe("pending");

  // -------------------------------------------------------------------------
  // Step 2 — AC-4 gate closed: POST /api/listings while status = pending
  // -------------------------------------------------------------------------

  const jwt2 = await buildTestJwt(jwksFixture, TEST_USER_ID);

  const listingsGateClosedRes = await app.request("/api/listings", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt2}` },
  });

  expect(listingsGateClosedRes.status).toBe(403);

  const gateClosedBody = (await listingsGateClosedRes.json()) as {
    error: string;
  };
  expect(gateClosedBody).toEqual({ error: "onboarding_required" });

  // -------------------------------------------------------------------------
  // Step 3 — AC-2: POST /api/webhooks/stripe with valid account.updated
  // -------------------------------------------------------------------------

  const webhookPayload = buildAccountUpdatedPayload(TEST_STRIPE_ACCOUNT_ID, {
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    disabled_reason: null,
  });
  const webhookSig = sign(webhookPayload, WEBHOOK_SECRET);

  const webhookRes = await app.request("/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": webhookSig,
    },
    body: webhookPayload,
  });

  expect(webhookRes.status).toBe(200);

  const webhookBody = (await webhookRes.json()) as { ok: boolean };
  expect(webhookBody.ok).toBe(true);

  // DB row must now show onboarding_status = complete, payouts_enabled = true.
  const rowAfterWebhook = db.store.get(TEST_USER_ID);
  expect(rowAfterWebhook?.onboardingStatus).toBe("complete");
  expect(rowAfterWebhook?.payoutsEnabled).toBe(true);

  // -------------------------------------------------------------------------
  // Step 4 — AC-3: GET /api/onboarding/status (now complete)
  // -------------------------------------------------------------------------

  const jwt3 = await buildTestJwt(jwksFixture, TEST_USER_ID);

  const statusRes = await app.request("/api/onboarding/status", {
    headers: { Authorization: `Bearer ${jwt3}` },
  });

  expect(statusRes.status).toBe(200);

  const statusBody = (await statusRes.json()) as {
    onboardingStatus: string;
    payoutsEnabled: boolean;
  };
  expect(statusBody).toEqual({
    onboardingStatus: "complete",
    payoutsEnabled: true,
  });

  // -------------------------------------------------------------------------
  // Step 5 — AC-4 gate open: POST /api/listings now returns 204
  // -------------------------------------------------------------------------

  const jwt4 = await buildTestJwt(jwksFixture, TEST_USER_ID);

  const listingsOpenRes = await app.request("/api/listings", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt4}` },
  });

  expect(listingsOpenRes.status).toBe(204);
});

// ---------------------------------------------------------------------------
// Test 2: not_started branch (no seller_accounts row)
// ---------------------------------------------------------------------------

it("AC-3 not_started: GET /api/onboarding/status returns not_started when no row exists", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(
    async (): Promise<JSONWebKeySet> => jwksFixture.jwks,
  );

  // Fresh empty DB — no seller_accounts rows.
  const db = buildInMemoryDb([]);

  const app = createApp({
    fetchJwks,
    onboardingStatusDeps: {
      db: db as any,
    },
  });

  const jwt = await buildTestJwt(jwksFixture, "user_no_row_456");

  const res = await app.request("/api/onboarding/status", {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  expect(res.status).toBe(200);

  const body = (await res.json()) as {
    onboardingStatus: string;
    payoutsEnabled: boolean;
  };
  expect(body).toEqual({
    onboardingStatus: "not_started",
    payoutsEnabled: false,
  });
});
