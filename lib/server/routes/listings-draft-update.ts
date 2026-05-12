/**
 * PATCH /api/listings/draft/:id
 *
 * Partial update for save-and-resume on a draft listing.
 *
 * Contract:
 *   - Requires Clerk auth — reads `c.var.userId`.
 *   - Accepts partial subset of attribute fields; unknown fields ignored.
 *   - Does NOT validate required fields (mid-draft saves are the whole point).
 *   - Ownership check: 403 if requestor is not the listing's seller.
 *   - Status check: 409 if listing is not in 'draft' status.
 *   - Returns 200 with merged listing object.
 *
 * Publish-time validation (required fields) is cycle-3, not here.
 */

import type { Context } from "hono";
import { eq, type SQL } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listings } from "~/lib/db/schema";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListingRow = {
  id: string;
  sellerUserId: string;
  status: string;
  series: string | null;
  issue: string | null;
  gradeCompany: string | null;
  gradeNumeric: string | null;
  priceCents: number | null;
  conditionNotes: string | null;
  catalogMatchId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PatchableFields = {
  series?: string | null;
  issue?: string | null;
  gradeCompany?: string | null;
  gradeNumeric?: string | null;
  priceCents?: number | null;
  conditionNotes?: string | null;
  catalogMatchId?: string | null;
};

type ListingsDraftUpdateDb = {
  select: () => {
    from: (table: typeof listings) => {
      where: (condition: SQL) => Promise<ListingRow[]>;
    };
  };
  update: (table: typeof listings) => {
    set: (values: Partial<ListingRow>) => {
      where: (condition: SQL) => Promise<void>;
    };
  };
};

export interface ListingsDraftUpdateDeps {
  db?: ListingsDraftUpdateDb;
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Body validation helpers
// ---------------------------------------------------------------------------

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

/**
 * Extracts only the known patchable fields from an arbitrary body object.
 * Returns null if any present field has an invalid type.
 */
function extractPatchFields(
  body: Record<string, unknown>,
): PatchableFields | null {
  const result: PatchableFields = {};

  if ("series" in body) {
    if (!isStringOrNull(body.series)) return null;
    result.series = body.series;
  }
  if ("issue" in body) {
    if (!isStringOrNull(body.issue)) return null;
    result.issue = body.issue;
  }
  if ("gradeCompany" in body) {
    if (!isStringOrNull(body.gradeCompany)) return null;
    result.gradeCompany = body.gradeCompany;
  }
  if ("gradeNumeric" in body) {
    if (!isStringOrNull(body.gradeNumeric)) return null;
    result.gradeNumeric = body.gradeNumeric;
  }
  if ("priceCents" in body) {
    if (!isNumberOrNull(body.priceCents)) return null;
    result.priceCents = body.priceCents;
  }
  if ("conditionNotes" in body) {
    if (!isStringOrNull(body.conditionNotes)) return null;
    result.conditionNotes = body.conditionNotes;
  }
  if ("catalogMatchId" in body) {
    if (!isStringOrNull(body.catalogMatchId)) return null;
    result.catalogMatchId = body.catalogMatchId;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsDraftUpdateHandler(deps: ListingsDraftUpdateDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>): Promise<Response> => {
    const userId = c.var.userId;
    const listingId = c.req.param("id") ?? "";
    const db = (deps.db ?? defaultDb) as ListingsDraftUpdateDb;
    const now = deps.now ?? (() => new Date());

    // ------------------------------------------------------------------
    // 1. Parse body.
    // ------------------------------------------------------------------
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await c.req.json();
    } catch (err) {
      logger.warn("listings-draft-update: body parse failed", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "invalid_body" }, 400);
    }

    // ------------------------------------------------------------------
    // 2. Validate and extract patchable fields.
    // ------------------------------------------------------------------
    const patchFields = extractPatchFields(rawBody);
    if (patchFields === null) {
      return c.json({ error: "invalid_body" }, 400);
    }

    // ------------------------------------------------------------------
    // 3. Load existing listing.
    // ------------------------------------------------------------------
    let existing: ListingRow | undefined;
    try {
      const rows = await db
        .select()
        .from(listings)
        .where(eq(listings.id, listingId));
      existing = rows[0];
    } catch (err) {
      logger.error("listings-draft-update: select failed", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }

    // ------------------------------------------------------------------
    // 4. Ownership check.
    // ------------------------------------------------------------------
    if (existing.sellerUserId !== userId) {
      logger.warn("listings-draft-update: forbidden — wrong owner", { userId, listingId });
      return c.json({ error: "forbidden" }, 403);
    }

    // ------------------------------------------------------------------
    // 5. Status check — only drafts are patchable.
    // ------------------------------------------------------------------
    if (existing.status !== "draft") {
      return c.json({ error: "not_draft" }, 409);
    }

    // ------------------------------------------------------------------
    // 6. Merge and update.
    // ------------------------------------------------------------------
    const updatedAt = now();
    const merged: ListingRow = {
      ...existing,
      ...patchFields,
      updatedAt,
    };

    try {
      await db
        .update(listings)
        .set({ ...patchFields, updatedAt })
        .where(eq(listings.id, listingId));
    } catch (err) {
      logger.error("listings-draft-update: update failed", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    return c.json(merged, 200);
  };
}
