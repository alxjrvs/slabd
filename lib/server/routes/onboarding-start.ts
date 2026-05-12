/**
 * POST /api/onboarding/start
 *
 * Clerk-gated handler that ensures the caller has a Stripe Connect Express
 * Account, then returns a fresh Stripe Account Link.
 *
 * Contract:
 *   - Reads `c.var.userId` (set by `clerkAuth()` upstream).
 *   - Looks up `seller_accounts` row for that user.
 *   - If no row exists OR `stripe_account_id` is null:
 *       creates a new Stripe Express account and upserts the row.
 *   - Calls `stripe.accountLinks.create` and returns `{ url, expiresAt }`.
 *
 * Options injection follows the same pattern as `clerkAuth()` and
 * `requireSellerOnboarded()` for testability.
 */

import type { Context } from "hono";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { logger } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { sellerAccounts } from "~/lib/db/schema";
import { getStripeClient } from "~/lib/server/stripe/client";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal Drizzle-compatible DB shape required by this handler. */
type SellerAccountRow = {
  userId: string;
  stripeAccountId: string | null;
  onboardingStatus: string;
  payoutsEnabled: boolean;
};

type SelectableDb = {
  select: () => {
    from: (table: typeof sellerAccounts) => {
      where: (
        condition: ReturnType<typeof eq>,
      ) => Promise<SellerAccountRow[]> | SellerAccountRow[];
    };
  };
  insert: (table: typeof sellerAccounts) => {
    values: (data: {
      userId: string;
      stripeAccountId: string;
      onboardingStatus: string;
      payoutsEnabled: boolean;
    }) => {
      onConflictDoUpdate: (opts: {
        target: (typeof sellerAccounts)["userId"];
        set: {
          stripeAccountId: string;
          onboardingStatus: string;
          payoutsEnabled: boolean;
        };
      }) => Promise<void> | void;
    };
  };
};

export interface OnboardingStartDeps {
  db?: SelectableDb;
  stripe?: Pick<Stripe, "accounts" | "accountLinks">;
  env?: { STRIPE_SECRET_KEY: string; EXPO_PUBLIC_APP_URL: string };
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function onboardingStartHandler(deps: OnboardingStartDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>) => {
    const userId = c.var.userId;

    const env = deps.env ?? {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
      EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL ?? "",
    };

    const db = (deps.db ?? defaultDb) as SelectableDb;

    const stripe =
      deps.stripe ??
      getStripeClient(env.STRIPE_SECRET_KEY);

    // ------------------------------------------------------------------
    // 1. Look up existing seller_accounts row.
    // ------------------------------------------------------------------
    let rows: SellerAccountRow[];
    try {
      const result = db.select().from(sellerAccounts).where(eq(sellerAccounts.userId, userId));
      rows = await Promise.resolve(result);
    } catch (err) {
      logger.error("onboarding-start: failed to query seller_accounts", { userId, err });
      return c.json({ error: "internal_error" }, 500);
    }

    const existingRow = rows[0] ?? null;
    let stripeAccountId = existingRow?.stripeAccountId ?? null;

    // ------------------------------------------------------------------
    // 2. Create Stripe Express account if none exists.
    // ------------------------------------------------------------------
    if (!stripeAccountId) {
      let newAccount: Stripe.Account;
      try {
        newAccount = await stripe.accounts.create({
          type: "express",
          country: "US",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
      } catch (err) {
        logger.error("onboarding-start: stripe.accounts.create failed", { userId, err });
        return c.json({ error: "stripe_error" }, 500);
      }

      stripeAccountId = newAccount.id;

      // Upsert seller_accounts row with new stripe_account_id.
      try {
        await Promise.resolve(
          db
            .insert(sellerAccounts)
            .values({
              userId,
              stripeAccountId,
              onboardingStatus: "pending",
              payoutsEnabled: false,
            })
            .onConflictDoUpdate({
              target: sellerAccounts.userId,
              set: {
                stripeAccountId,
                onboardingStatus: "pending",
                payoutsEnabled: false,
              },
            }),
        );
      } catch (err) {
        // FK violation means users row is missing — do not auto-create.
        logger.error("onboarding-start: failed to upsert seller_accounts", { userId, err });
        return c.json({ error: "internal_error" }, 500);
      }
    }

    // ------------------------------------------------------------------
    // 3. Create Stripe Account Link.
    // ------------------------------------------------------------------
    const appUrl = env.EXPO_PUBLIC_APP_URL.replace(/\/$/, "");
    const returnUrl = `${appUrl}/onboarding/return`;
    const refreshUrl = `${appUrl}/onboarding/refresh`;

    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: "account_onboarding",
        return_url: returnUrl,
        refresh_url: refreshUrl,
      });
    } catch (err) {
      logger.error("onboarding-start: stripe.accountLinks.create failed", {
        userId,
        stripeAccountId,
        err,
      });
      return c.json({ error: "stripe_error" }, 500);
    }

    return c.json(
      {
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
      },
      200,
    );
  };
}
