/**
 * GET /api/onboarding/status
 *
 * Clerk-gated handler. Returns { onboardingStatus, payoutsEnabled } for the
 * current user. Synthesizes `not_started` when no seller_accounts row exists
 * (per ADR-0003 — the `not_started` value is never persisted to the DB).
 *
 * Wiring (cycle-5 will mount this):
 *   app.get("/api/onboarding/status", clerkAuth(), onboardingStatusHandler({ db }))
 */

import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db as defaultDb } from "~/lib/db";
import { sellerAccounts } from "~/lib/db/schema";
import { logger, serializeError } from "~/lib/logger";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal Drizzle-compatible DB shape required by this handler. */
type SelectableDb = {
  select: () => {
    from: (table: typeof sellerAccounts) => {
      where: (
        condition: ReturnType<typeof eq>,
      ) => Promise<{ onboardingStatus: string; payoutsEnabled: boolean }[]>;
    };
  };
};

export interface OnboardingStatusDeps {
  /**
   * Injectable DB client. Defaults to the production `db` proxy.
   * Override in tests to provide a mock without live DB access.
   */
  db?: SelectableDb;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

/**
 * Returns a Hono handler that reads `seller_accounts` for `c.var.userId`
 * and responds with `{ onboardingStatus, payoutsEnabled }`.
 *
 * When no row exists, synthesizes `{ onboardingStatus: "not_started", payoutsEnabled: false }`.
 * Returns `500 { error: "internal_error" }` on DB failure — "can't read DB" is
 * distinct from "no row found".
 */
export function onboardingStatusHandler(deps: OnboardingStatusDeps = {}) {
  const db = (deps.db ?? defaultDb) as SelectableDb;

  return async (c: Context<{ Variables: AppVars }>) => {
    const userId = c.var.userId;

    let row: { onboardingStatus: string; payoutsEnabled: boolean } | null;
    try {
      const rows = await db
        .select()
        .from(sellerAccounts)
        .where(eq(sellerAccounts.userId, userId));
      row = rows[0] ?? null;
    } catch (err) {
      logger.error("[onboarding-status] DB query failed", {
        userId,
        ...serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!row) {
      return c.json({ onboardingStatus: "not_started", payoutsEnabled: false });
    }

    return c.json({
      onboardingStatus: row.onboardingStatus,
      payoutsEnabled: row.payoutsEnabled,
    });
  };
}
