/**
 * Listing-publish gate middleware.
 *
 * `requireSellerOnboarded()` is a Hono middleware factory that reads
 * `seller_accounts` for `c.var.userId` and returns
 * `403 { error: "onboarding_required" }` unless `onboarding_status === "complete"`.
 *
 * Follows the same options-injection pattern as `clerkAuth()`: pass `{ db }`
 * in tests to inject a mock; omit in production to use the live DB proxy.
 *
 * Composition (from app.ts, cycle-5):
 *   app.use("/api/listings", clerkAuth(), requireSellerOnboarded())
 */

import type { Context, MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { db as defaultDb } from "~/lib/db";
import { sellerAccounts } from "~/lib/db/schema";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal Drizzle-compatible DB shape required by the middleware. */
type SelectableDb = {
  select: () => {
    from: (table: typeof sellerAccounts) => {
      where: (condition: ReturnType<typeof eq>) => { onboardingStatus: string }[];
    };
  };
};

export interface RequireSellerOnboardedOptions {
  /**
   * Injectable DB client. Defaults to the production `db` proxy.
   * Override in tests to provide a mock without live DB access.
   */
  db?: SelectableDb;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns a Hono middleware that gates on `seller_accounts.onboarding_status === "complete"`.
 * Returns `403 { error: "onboarding_required" }` for any other status (including missing row).
 */
export function requireSellerOnboarded(
  options: RequireSellerOnboardedOptions = {},
): MiddlewareHandler<{ Variables: AppVars }> {
  const db = (options.db ?? defaultDb) as SelectableDb;

  return async (c: Context<{ Variables: AppVars }>, next) => {
    const userId = c.var.userId;

    const rows = db
      .select()
      .from(sellerAccounts)
      .where(eq(sellerAccounts.userId, userId));

    const row = rows[0] ?? null;

    if (!row || row.onboardingStatus !== "complete") {
      return c.json({ error: "onboarding_required" }, 403);
    }

    await next();
  };
}
