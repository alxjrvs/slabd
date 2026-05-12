/**
 * POST /api/listings/:id/publish
 *
 * State-transition endpoint that flips a draft listing to published.
 *
 * Contract:
 *   - Requires Clerk auth — reads `c.var.userId`.
 *   - 404 when listing not found.
 *   - 403 when caller is not the owner.
 *   - 409 when listing is not in draft status.
 *   - 422 when required fields are missing/invalid or < 2 images exist.
 *   - 200 with the updated listing JSON on success.
 *
 * No transactions: Neon HTTP driver does not support them. Sequential awaited
 * writes are used per S-1.2 precedent.
 */

import type { Context } from "hono";
import { eq, type SQL } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listings, listingImages } from "~/lib/db/schema";
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

type ImageRow = {
  id: string;
  listingId: string;
  r2Key: string;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
};

type ListingsPublishDb = {
  select: () => {
    from: (table: unknown) => {
      where: (condition: SQL) => Promise<ListingRow[] | ImageRow[]>;
    };
  };
  update: (table: typeof listings) => {
    set: (values: Partial<ListingRow & { publishedAt: Date; updatedAt: Date }>) => {
      where: (condition: SQL) => Promise<void>;
    };
  };
};

export interface ListingsPublishDeps {
  db?: ListingsPublishDb;
  now?: () => Date;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_GRADE_COMPANIES = new Set(["Raw", "CGC", "CBCS"]);

/**
 * Validates all publish requirements and returns a fields error map.
 * An empty map means validation passed.
 */
function validatePublishRequirements(
  listing: ListingRow,
  imageCount: number,
): Record<string, string> {
  const fields: Record<string, string> = {};

  // series
  if (listing.series === null || listing.series === "") {
    fields.series = "missing";
  }

  // issue
  if (listing.issue === null || listing.issue === "") {
    fields.issue = "missing";
  }

  // grade_company
  if (listing.gradeCompany === null || listing.gradeCompany === "") {
    fields.grade_company = "missing";
  } else if (!VALID_GRADE_COMPANIES.has(listing.gradeCompany)) {
    fields.grade_company = "invalid";
  }

  // grade_numeric — stored as numeric(3,1), may come back as string from DB
  if (listing.gradeNumeric === null || listing.gradeNumeric === "") {
    fields.grade_numeric = "missing";
  } else {
    const n = typeof listing.gradeNumeric === "string"
      ? parseFloat(listing.gradeNumeric)
      : listing.gradeNumeric;
    if (isNaN(n) || n < 0.5 || n > 10.0) {
      fields.grade_numeric = "invalid";
    }
  }

  // price_cents
  if (listing.priceCents === null || listing.priceCents === undefined) {
    fields.price_cents = "missing";
  } else if (!Number.isInteger(listing.priceCents) || listing.priceCents < 100) {
    fields.price_cents = "invalid";
  }

  // images_count
  if (imageCount === 0) {
    fields.images_count = "missing";
  } else if (imageCount < 2) {
    fields.images_count = "insufficient";
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsPublishHandler(deps: ListingsPublishDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>) => {
    const userId = c.var.userId;
    const listingId = c.req.param("id") ?? "";

    const db = (deps.db ?? defaultDb) as ListingsPublishDb;
    const now = deps.now ? deps.now() : new Date();

    // ------------------------------------------------------------------
    // 1. Load listing.
    // ------------------------------------------------------------------
    let listing: ListingRow | undefined;
    try {
      const rows = await db
        .select()
        .from(listings)
        .where(eq(listings.id, listingId)) as ListingRow[];
      listing = rows[0];
    } catch (err) {
      logger.error("listings-publish: failed to query listing", {
        listingId,
        userId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!listing) {
      return c.json({ error: "not_found" }, 404);
    }

    // ------------------------------------------------------------------
    // 2. Ownership gate.
    // ------------------------------------------------------------------
    if (listing.sellerUserId !== userId) {
      return c.json({ error: "forbidden" }, 403);
    }

    // ------------------------------------------------------------------
    // 3. State check — only drafts may be published.
    // ------------------------------------------------------------------
    if (listing.status !== "draft") {
      return c.json({ error: "not_draft", currentStatus: listing.status }, 409);
    }

    // ------------------------------------------------------------------
    // 4. Count confirmed images.
    // ------------------------------------------------------------------
    let imageCount: number;
    try {
      const images = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId)) as ImageRow[];
      imageCount = images.length;
    } catch (err) {
      logger.error("listings-publish: failed to query listing images", {
        listingId,
        userId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    // ------------------------------------------------------------------
    // 5. Required-fields validation.
    // ------------------------------------------------------------------
    const fields = validatePublishRequirements(listing, imageCount);
    if (Object.keys(fields).length > 0) {
      return c.json({ error: "validation_failed", fields }, 422);
    }

    // ------------------------------------------------------------------
    // 6. Publish: update status, publishedAt, updatedAt.
    // ------------------------------------------------------------------
    try {
      await db
        .update(listings)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(eq(listings.id, listingId));
    } catch (err) {
      logger.error("listings-publish: failed to update listing", {
        listingId,
        userId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    // ------------------------------------------------------------------
    // 7. Return the updated listing with published values applied.
    // ------------------------------------------------------------------
    const published = {
      id: listing.id,
      sellerUserId: listing.sellerUserId,
      status: "published",
      series: listing.series,
      issue: listing.issue,
      gradeCompany: listing.gradeCompany,
      gradeNumeric: listing.gradeNumeric,
      priceCents: listing.priceCents,
      conditionNotes: listing.conditionNotes,
      catalogMatchId: listing.catalogMatchId,
      publishedAt: now.toISOString(),
      createdAt: listing.createdAt instanceof Date
        ? listing.createdAt.toISOString()
        : listing.createdAt,
      updatedAt: now.toISOString(),
    };

    return c.json(published, 200);
  };
}
