/**
 * POST /api/webhooks/stripe
 *
 * Verifies Stripe-Signature, records event ID for idempotency, and
 * dispatches on event type. The webhook endpoint is unauthenticated —
 * Stripe's HMAC signature is the sole auth gate (per ADR-0001).
 *
 * Wiring into app.ts is handled by cycle-5.
 *
 * AC-2: Stripe webhook reconciles onboarding state.
 */

import type { Context } from "hono";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db as defaultDb } from "~/lib/db";
import { sellerAccounts } from "~/lib/db/schema";
import { getStripeClient } from "../stripe/client";
import { recordEvent } from "../stripe/idempotency";
import { mapStripeAccountToStatus } from "../stripe/onboarding-status";
import { logger, serializeError } from "~/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal Drizzle DB shape: select.from.where + update.set.where. */
type WebhookDb = {
  select: () => {
    from: (table: typeof sellerAccounts) => {
      where: (
        condition: ReturnType<typeof eq>,
      ) => { userId: string; stripeAccountId: string | null }[] | Promise<{ userId: string; stripeAccountId: string | null }[]>;
    };
  };
  update: (table: typeof sellerAccounts) => {
    set: (values: {
      onboardingStatus: string;
      payoutsEnabled: boolean;
      updatedAt: Date;
    }) => {
      where: (condition: ReturnType<typeof eq>) => unknown;
    };
  };
  // Idempotency insert surface (passed through to recordEvent)
  insert: (table: unknown) => {
    values: (data: { eventId: string }) => {
      onConflictDoNothing: () => {
        returning: (fields: unknown) => { eventId: string }[] | Promise<{ eventId: string }[]>;
      };
    };
  };
};

export interface StripeWebhookDeps {
  db?: WebhookDb;
  stripe?: Stripe;
  env?: { STRIPE_WEBHOOK_SECRET: string };
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

/**
 * Returns a Hono handler for `POST /api/webhooks/stripe`.
 *
 * Injectable `deps` for testability; all fields default to production
 * singletons when omitted.
 */
export function stripeWebhookHandler(deps: StripeWebhookDeps = {}) {
  return async (c: Context): Promise<Response> => {
    const webhookSecret =
      deps.env?.STRIPE_WEBHOOK_SECRET ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      "";

    const stripeClient =
      deps.stripe ??
      getStripeClient(process.env.STRIPE_SECRET_KEY ?? "");

    const db = (deps.db ?? defaultDb) as WebhookDb;

    // 1. Read raw body as text — HMAC is over raw bytes.
    const rawBody = await c.req.text();

    // 2. Read Stripe-Signature header.
    const signature = c.req.header("stripe-signature") ?? "";

    // 3. Verify signature via the async form (Workers-safe, ADR-0001).
    let event: Stripe.Event;
    try {
      event = await stripeClient.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      logger.error("[stripe-webhook] signature verification failed", serializeError(err));
      return c.json({ error: "invalid_signature" }, 400);
    }

    // 4. Record event for idempotency.
    //    If this insert throws, the idempotency row was NOT committed — Stripe
    //    can safely retry and will attempt the insert again.
    let idempotencyResult: { inserted: boolean };
    try {
      idempotencyResult = await recordEvent(
        db as Parameters<typeof recordEvent>[0],
        event.id,
      );
    } catch (err) {
      logger.error("[stripe-webhook] recordEvent (idempotency insert) failed", {
        eventId: event.id,
        ...serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!idempotencyResult.inserted) {
      return c.json({ ok: true, duplicate: true });
    }

    // 5. Dispatch on event type.
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;

      // Look up the seller_accounts row by stripe_account_id.
      let row: { userId: string; stripeAccountId: string | null } | undefined;
      try {
        const rows = await db
          .select()
          .from(sellerAccounts)
          .where(eq(sellerAccounts.stripeAccountId, account.id));
        row = Array.isArray(rows) ? rows[0] : undefined;
      } catch (err) {
        logger.error("[stripe-webhook] DB select for stripeAccountId failed", {
          eventId: event.id,
          stripeAccountId: account.id,
          ...serializeError(err),
        });
        return c.json({ error: "internal_error" }, 500);
      }

      if (!row) {
        logger.warn("[stripe-webhook] account.updated for unknown stripe_account_id", {
          stripeAccountId: account.id,
        });
        return c.json({ ok: true, ignored: "unknown_account" });
      }

      const onboardingStatus = mapStripeAccountToStatus(account);
      const payoutsEnabled = account.payouts_enabled ?? false;

      // Update seller_accounts row.
      // If this throws, the idempotency record IS committed. Stripe will retry
      // the webhook and receive duplicate:true without retrying this update.
      // Log at error severity so reconciliation can be performed manually.
      try {
        await db
          .update(sellerAccounts)
          .set({ onboardingStatus, payoutsEnabled, updatedAt: new Date() })
          .where(eq(sellerAccounts.stripeAccountId, account.id));
      } catch (err) {
        logger.error(
          "[stripe-webhook] DB update failed — idempotency record committed, manual reconciliation required",
          {
            eventId: event.id,
            stripeAccountId: account.id,
            targetOnboardingStatus: onboardingStatus,
            targetPayoutsEnabled: payoutsEnabled,
            ...serializeError(err),
          },
        );
        return c.json({ error: "internal_error" }, 500);
      }

      return c.json({ ok: true });
    }

    // Unknown event type — acknowledge without side effects.
    return c.json({ ok: true, ignored: event.type });
  };
}
