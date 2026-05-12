/**
 * GET /api/listings/draft/:id
 *
 * Returns the full draft listing state with images joined.
 *
 * Contract:
 *   - Requires Clerk auth — reads `c.var.userId`.
 *   - Ownership check: 403 if requestor is not the listing's seller.
 *   - Returns 200 with full draft + images: ImageRow[].
 *
 * Images are ordered by position ascending for deterministic display order.
 */

import type { Context } from "hono";
import { eq, asc, type SQL } from "drizzle-orm";

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

type ListingsDraftGetDb = {
  select: () => {
    from: (table: typeof listings | typeof listingImages) => {
      where: (condition: SQL) => {
        orderBy?: (col: unknown) => Promise<ImageRow[]>;
      } & Promise<ListingRow[] | ImageRow[]>;
    };
  };
};

export interface ListingsDraftGetDeps {
  db?: ListingsDraftGetDb;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsDraftGetHandler(deps: ListingsDraftGetDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>): Promise<Response> => {
    const userId = c.var.userId;
    const listingId = c.req.param("id") ?? "";
    const db = (deps.db ?? defaultDb) as unknown as {
      select: () => {
        from: (table: unknown) => {
          where: (cond: SQL) => Promise<ListingRow[]> & {
            orderBy: (col: unknown) => Promise<ImageRow[]>;
          };
        };
      };
    };

    // ------------------------------------------------------------------
    // 1. Load listing.
    // ------------------------------------------------------------------
    let listing: ListingRow | undefined;
    try {
      const rows = await db.select().from(listings).where(eq(listings.id, listingId));
      listing = (rows as ListingRow[])[0];
    } catch (err) {
      logger.error("listings-draft-get: select listing failed", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!listing) {
      return c.json({ error: "not_found" }, 404);
    }

    // ------------------------------------------------------------------
    // 2. Ownership check.
    // ------------------------------------------------------------------
    if (listing.sellerUserId !== userId) {
      logger.warn("listings-draft-get: forbidden — wrong owner", { userId, listingId });
      return c.json({ error: "forbidden" }, 403);
    }

    // ------------------------------------------------------------------
    // 3. Load images ordered by position asc.
    // ------------------------------------------------------------------
    let images: ImageRow[];
    try {
      images = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(asc(listingImages.position));
    } catch (err) {
      logger.error("listings-draft-get: select images failed", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    // ------------------------------------------------------------------
    // 4. Return full state.
    // ------------------------------------------------------------------
    return c.json(
      {
        id: listing.id,
        sellerUserId: listing.sellerUserId,
        status: listing.status,
        series: listing.series,
        issue: listing.issue,
        gradeCompany: listing.gradeCompany,
        gradeNumeric: listing.gradeNumeric,
        priceCents: listing.priceCents,
        conditionNotes: listing.conditionNotes,
        catalogMatchId: listing.catalogMatchId,
        publishedAt: listing.publishedAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        images: images.map((img) => ({
          id: img.id,
          r2Key: img.r2Key,
          position: img.position,
          isPrimary: img.isPrimary,
        })),
      },
      200,
    );
  };
}
