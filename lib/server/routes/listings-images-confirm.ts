/**
 * POST /api/listings/:id/images/confirm
 *
 * Confirms an uploaded image for a listing and optionally promotes it to primary.
 *
 * Contract:
 *   - Requires Clerk auth — reads `c.var.userId`.
 *   - Ownership gate: stubs true for now (real lookup lands in S-2.4 with listings table).
 *   - Validates request body: { key: string, isPrimary?: boolean, position?: number }.
 *   - Enforces 8-image cap per listing.
 *   - When isPrimary: true — demotes existing primary THEN inserts new primary.
 *   - When isPrimary absent/false — inserts non-primary, auto-promotes if first image.
 *   - Returns 201 with the inserted image record.
 *
 * Atomic primary swap note: Drizzle does not expose transactions on the Neon HTTP
 * driver; sequential awaited statements are used per S-1.2 precedent.
 */

import type { Context } from "hono";
import { eq, and, type SQL } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listingImages } from "~/lib/db/schema";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImageRow = {
  id: string;
  listingId: string;
  r2Key: string;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
};

type ListingsImagesDb = {
  select: () => {
    from: (table: typeof listingImages) => {
      where: (
        condition: SQL,
      ) => Promise<ImageRow[]>;
    };
  };
  update: (table: typeof listingImages) => {
    set: (values: Partial<ImageRow>) => {
      where: (
        condition: SQL,
      ) => Promise<void>;
    };
  };
  insert: (table: typeof listingImages) => {
    values: (data: ImageRow) => Promise<unknown>;
  };
};

export interface ListingsImagesConfirmDeps {
  db?: ListingsImagesDb;
  randomUUID?: () => string;
  /** Injected for testing; production code uses the local ownsListing fn. */
  ownsListing?: (listingId: string, userId: string, db: ListingsImagesDb) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Ownership gate
// ---------------------------------------------------------------------------

/**
 * Stub ownership gate — always returns true.
 * TODO(S-2.4): replace with real listings-table lookup when listings table lands.
 */
async function ownsListing(_listingId: string, _userId: string, _db: ListingsImagesDb): Promise<boolean> {
  return true;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsImagesConfirmHandler(deps: ListingsImagesConfirmDeps = {}) {
  return async (c: Context<{ Variables: AppVars }>) => {
    const userId = c.var.userId;
    const listingId = c.req.param("id") ?? "";

    const db = (deps.db ?? defaultDb) as ListingsImagesDb;
    const randomUUID = deps.randomUUID ?? (() => crypto.randomUUID());
    const checkOwnership = deps.ownsListing ?? ownsListing;

    // ------------------------------------------------------------------
    // 1. Validate request body.
    // ------------------------------------------------------------------
    let body: { key?: unknown; isPrimary?: unknown; position?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }

    const key = body?.key;
    if (typeof key !== "string" || key.trim() === "") {
      return c.json({ error: "invalid_body" }, 400);
    }

    const isPrimary = typeof body.isPrimary === "boolean" ? body.isPrimary : false;
    const requestedPosition = typeof body.position === "number" ? body.position : undefined;

    // ------------------------------------------------------------------
    // 2. Ownership gate.
    // ------------------------------------------------------------------
    let owned: boolean;
    try {
      owned = await checkOwnership(listingId, userId, db);
    } catch (err) {
      logger.error("listings-images-confirm: ownership check failed", {
        listingId,
        userId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (!owned) {
      return c.json({ error: "forbidden" }, 403);
    }

    // ------------------------------------------------------------------
    // 3. Fetch existing images for this listing.
    // ------------------------------------------------------------------
    let existingImages: ImageRow[];
    try {
      existingImages = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));
    } catch (err) {
      logger.error("listings-images-confirm: failed to query listing images", {
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    // ------------------------------------------------------------------
    // 4. Enforce 8-image cap.
    // ------------------------------------------------------------------
    if (existingImages.length >= 8) {
      return c.json({ error: "image_limit_exceeded" }, 400);
    }

    // ------------------------------------------------------------------
    // 5. Compute position and isPrimary for the new image.
    // ------------------------------------------------------------------
    const isFirstImage = existingImages.length === 0;

    // First image is always primary regardless of isPrimary flag.
    const finalIsPrimary = isFirstImage ? true : isPrimary;

    // Position: use requested value, or highest existing + 1, or 0 if none.
    let position: number;
    if (requestedPosition !== undefined) {
      position = requestedPosition;
    } else if (existingImages.length > 0) {
      position = Math.max(...existingImages.map((img) => img.position)) + 1;
    } else {
      position = 0;
    }

    const id = randomUUID();
    const now = new Date();

    // ------------------------------------------------------------------
    // 6. Atomic primary swap when isPrimary is requested (non-first image).
    // ------------------------------------------------------------------
    try {
      if (finalIsPrimary && !isFirstImage) {
        // Drizzle does not expose transactions on the Neon HTTP driver;
        // sequential awaited statements are used per S-1.2 precedent.
        // and() returns SQL | undefined; both conditions are always defined here.
        const demoteCond = and(
          eq(listingImages.listingId, listingId),
          eq(listingImages.isPrimary, true),
        )!;
        await db
          .update(listingImages)
          .set({ isPrimary: false })
          .where(demoteCond);
      }

      await db.insert(listingImages).values({
        id,
        listingId,
        r2Key: key,
        position,
        isPrimary: finalIsPrimary,
        createdAt: now,
      });
    } catch (err) {
      logger.error("listings-images-confirm: failed to insert image", {
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    // ------------------------------------------------------------------
    // 7. Return the created record.
    // ------------------------------------------------------------------
    return c.json(
      {
        id,
        listingId,
        r2Key: key,
        position,
        isPrimary: finalIsPrimary,
        createdAt: now.toISOString(),
      },
      201,
    );
  };
}
