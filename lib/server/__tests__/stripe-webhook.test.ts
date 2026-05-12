/**
 * Tests for lib/server/routes/stripe-webhook.ts
 *
 * Uses Jest globals (do NOT import from bun:test).
 * Uses the real `stripe` package for signature generation/verification.
 *
 * Pins:
 * 1. Valid sig + account.updated → status update
 * 2. Duplicate event.id → 200 without update
 * 3. Invalid signature → 400
 * 4. Unknown event type → 200 no-op (recordEvent IS called)
 * 5. Unknown stripe_account_id → 200 ignored (no update)
 * 6. recordEvent throws → 500, db.update NOT called (Stripe will retry)
 * 7. db.update throws → 500, error logged with context (idempotency committed, manual reconciliation needed)
 */

import crypto from "crypto";
import { Hono } from "hono";
import Stripe from "stripe";
import { stripeWebhookHandler, type StripeWebhookDeps } from "../routes/stripe-webhook";
import { STRIPE_API_VERSION } from "../stripe/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = "whsec_test_dummy_1234567890abcdef";
const STRIPE_ACCOUNT_ID = "acct_test_abc123";
const USER_ID = "user_test_xyz";

// ---------------------------------------------------------------------------
// Stripe instance for the handler under test
// ---------------------------------------------------------------------------

// Injected into the handler for constructEventAsync. We use the fetch-based
// client here because that's what production uses (Workers-safe, ADR-0001).
// generateTestHeaderString is NOT called on this instance — see sign() below.
const stripeForTests = new Stripe("sk_test_dummy", {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: STRIPE_API_VERSION,
});

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Stripe Account payload that constructEventAsync can parse.
 */
function buildAccountUpdatedPayload(overrides: Partial<Stripe.Account> = {}): string {
  const account: Partial<Stripe.Account> = {
    id: STRIPE_ACCOUNT_ID,
    object: "account",
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    requirements: { disabled_reason: null } as Stripe.Account.Requirements,
    ...overrides,
  };
  const event = {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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

/**
 * Build a generic signed event payload for a given event type.
 */
function buildGenericEventPayload(type: string): string {
  const event = {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: "event",
    type,
    data: { object: { id: "obj_test_123", object: "customer" } },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: null,
    api_version: STRIPE_API_VERSION,
  };
  return JSON.stringify(event);
}

/**
 * Generate a valid Stripe-Signature header for the given payload + secret.
 *
 * Uses Node's `crypto.createHmac` directly rather than the Stripe SDK's
 * `generateTestHeaderString`, because the Stripe ESM build routes through
 * `SubtleCryptoProvider` which is async-only and throws from the synchronous
 * `generateTestHeaderString` call path under Bun.
 *
 * This produces the same format Stripe produces: `t=<unix>,v1=<hmac-hex>`.
 */
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
// DB mock helpers
// ---------------------------------------------------------------------------

type MockSellerRow = {
  userId: string;
  stripeAccountId: string | null;
  onboardingStatus?: string;
  payoutsEnabled?: boolean;
};

interface MockDb {
  select: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  // Captured update call for assertions
  lastUpdateSet: Record<string, unknown> | null;
}

/**
 * Build a mock DB with injectable seller_accounts row.
 * Tracks the last update.set() call for assertion.
 */
function buildMockDb(row: MockSellerRow | null): MockDb {
  const db: MockDb = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    lastUpdateSet: null,
  };

  // select().from().where() → returns the row array
  db.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(row ? [row] : []),
    }),
  });

  // update().set().where() → resolves to undefined
  db.update.mockReturnValue({
    set: jest.fn().mockImplementation((values: Record<string, unknown>) => {
      db.lastUpdateSet = values;
      return {
        where: jest.fn().mockResolvedValue(undefined),
      };
    }),
  });

  // insert().values().onConflictDoNothing().returning() — first call inserts
  let insertCalled = false;
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockReturnValue({
        returning: jest.fn().mockImplementation(() => {
          if (insertCalled) return Promise.resolve([]);
          insertCalled = true;
          return Promise.resolve([{ eventId: "evt_test" }]);
        }),
      }),
    }),
  });

  return db;
}

/**
 * Build a mock DB whose recordEvent always returns { inserted: false }
 * (simulates duplicate delivery).
 */
function buildDuplicateMockDb(row: MockSellerRow | null): MockDb {
  const db = buildMockDb(row);

  // Override insert to always return [] (ON CONFLICT DO NOTHING hit)
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    }),
  });

  return db;
}

/**
 * Build a mock DB whose insert (idempotency) throws.
 */
function buildThrowingInsertMockDb(): MockDb {
  const db: MockDb = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    lastUpdateSet: null,
  };

  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockReturnValue({
        returning: jest.fn().mockRejectedValue(new Error("DB insert failed")),
      }),
    }),
  });

  // select and update should not be called, but mock them for assertion
  db.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  });
  db.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  });

  return db;
}

/**
 * Build a mock DB whose db.update throws after a successful insert and select.
 */
function buildThrowingUpdateMockDb(row: MockSellerRow): MockDb {
  const db: MockDb = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    lastUpdateSet: null,
  };

  // Idempotency insert succeeds (first call inserts)
  let insertCalled = false;
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockReturnValue({
        returning: jest.fn().mockImplementation(() => {
          if (insertCalled) return Promise.resolve([]);
          insertCalled = true;
          return Promise.resolve([{ eventId: "evt_test" }]);
        }),
      }),
    }),
  });

  // select succeeds
  db.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([row]),
    }),
  });

  // update throws
  db.update.mockReturnValue({
    set: jest.fn().mockImplementation((values: Record<string, unknown>) => {
      db.lastUpdateSet = values;
      return {
        where: jest.fn().mockRejectedValue(new Error("DB update failed")),
      };
    }),
  });

  return db;
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(db: MockDb) {
  const app = new Hono();
  app.post(
    "/api/webhooks/stripe",
    stripeWebhookHandler({
      db: db as StripeWebhookDeps["db"],
      stripe: stripeForTests,
      env: { STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET },
    }),
  );
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("stripeWebhookHandler", () => {
  // -------------------------------------------------------------------------
  // 1. Valid signature + account.updated → status update
  // -------------------------------------------------------------------------
  it("handles account.updated with valid signature and updates onboarding_status", async () => {
    const db = buildMockDb({
      userId: USER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload({
      id: STRIPE_ACCOUNT_ID,
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { disabled_reason: null } as Stripe.Account.Requirements,
    });
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body).toEqual({ ok: true });

    // update.set() must have been called with onboarding_status: "complete"
    expect(db.update).toHaveBeenCalled();
    expect(db.lastUpdateSet).toMatchObject({
      onboardingStatus: "complete",
      payoutsEnabled: true,
    });
  });

  // -------------------------------------------------------------------------
  // 2. Duplicate event.id → 200 without update
  // -------------------------------------------------------------------------
  it("returns 200 with duplicate: true and skips update on duplicate event", async () => {
    const db = buildDuplicateMockDb({
      userId: USER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload();
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; duplicate: boolean };
    expect(body).toEqual({ ok: true, duplicate: true });

    // update must NOT have been called
    expect(db.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Invalid signature → 400
  // -------------------------------------------------------------------------
  it("returns 400 with invalid_signature on bad signature", async () => {
    const db = buildMockDb(null);
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload();
    // Deliberately wrong signature
    const badSig = "t=1,v1=deadbeef";

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": badSig,
      },
      body: payload,
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_signature" });

    // No DB writes on bad signature
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Unknown event type → 200 no-op (but recordEvent IS called)
  // -------------------------------------------------------------------------
  it("returns 200 with ignored field on unknown event type, but records the event", async () => {
    const db = buildMockDb(null);
    const app = buildApp(db);

    const payload = buildGenericEventPayload("customer.created");
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; ignored: string };
    expect(body.ok).toBe(true);
    expect(body.ignored).toBe("customer.created");

    // recordEvent must have been called (insert invoked)
    expect(db.insert).toHaveBeenCalled();
    // update must NOT have been called
    expect(db.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Unknown stripe_account_id → 200 ignored (no update)
  // -------------------------------------------------------------------------
  it("returns 200 with ignored: unknown_account when stripe_account_id not in seller_accounts", async () => {
    // DB returns empty array — no matching row
    const db = buildMockDb(null);
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload({ id: "acct_unknown_999" });
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; ignored: string };
    expect(body).toEqual({ ok: true, ignored: "unknown_account" });

    // update must NOT have been called
    expect(db.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. recordEvent throws → 500, db.update NOT called (Stripe can retry safely)
  // -------------------------------------------------------------------------
  it("returns 500 when recordEvent (idempotency insert) throws and never calls db.update", async () => {
    const db = buildThrowingInsertMockDb();
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload({ id: STRIPE_ACCOUNT_ID });
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "internal_error" });

    // stripe.accounts.create was invoked (insert was attempted)
    expect(db.insert).toHaveBeenCalled();
    // db.update must NOT have been called — idempotency row was not committed
    expect(db.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. db.update throws → 500 (idempotency committed; log loudly for reconciliation)
  // -------------------------------------------------------------------------
  it("returns 500 when db.update throws after idempotency insert succeeds", async () => {
    const db = buildThrowingUpdateMockDb({
      userId: USER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
    });
    const app = buildApp(db);

    const payload = buildAccountUpdatedPayload({
      id: STRIPE_ACCOUNT_ID,
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { disabled_reason: null } as Stripe.Account.Requirements,
    });
    const sig = sign(payload, WEBHOOK_SECRET);

    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": sig,
      },
      body: payload,
    });

    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "internal_error" });

    // idempotency insert was called
    expect(db.insert).toHaveBeenCalled();
    // update was attempted (and threw)
    expect(db.update).toHaveBeenCalled();
  });
});
