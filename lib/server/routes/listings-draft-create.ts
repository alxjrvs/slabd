/**
 * POST /api/listings/draft
 *
 * Creates a new draft listing for a signed-in, onboarded seller.
 *
 * Contract:
 *   - Requires Clerk auth — reads `c.var.userId` (set by upstream middleware).
 *   - No required body fields; draft starts empty.
 *   - Generates a UUID for the new listing id.
 *   - Inserts a row with status='draft' and the seller's userId.
 *   - Returns 201 { id }.
 *
 * Auth/onboarding gating (401/403) is handled by upstream middleware — out of
 * scope for this handler.
 */

import type { Context } from "hono";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listings } from "~/lib/db/schema";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListingInsertRow = {
  id: string;
  sellerUserId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ListingsDraftCreateDb = {
  insert: (table: typeof listings) => {
    values: (data: ListingInsertRow) => Promise<unknown>;
  };
};

export interface ListingsDraftCreateDeps {
  db?: ListingsDraftCreateDb;
  randomUUID?: () => string;
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsDraftCreateHandler(deps: ListingsDraftCreateDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>): Promise<Response> => {
    const userId = c.var.userId;
    const db = (deps.db ?? defaultDb) as ListingsDraftCreateDb;
    const randomUUID = deps.randomUUID ?? (() => crypto.randomUUID());
    const now = deps.now ?? (() => new Date());

    // ------------------------------------------------------------------
    // 1. Parse body (no required fields; just must be valid JSON).
    // ------------------------------------------------------------------
    try {
      await c.req.json();
    } catch (err) {
      logger.warn("listings-draft-create: body parse failed", {
        userId,
        err: serializeError(err),
      });
      return c.json({ error: "invalid_body" }, 400);
    }

    // ------------------------------------------------------------------
    // 2. Insert draft listing.
    // ------------------------------------------------------------------
    const id = randomUUID();
    const timestamp = now();

    try {
      await db.insert(listings).values({
        id,
        sellerUserId: userId,
        status: "draft",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } catch (err) {
      logger.error("listings-draft-create: insert failed", {
        userId,
        id,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    return c.json({ id }, 201);
  };
}
