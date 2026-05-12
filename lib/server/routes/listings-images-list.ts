/**
 * GET /api/listings/:id/images
 *
 * PUBLIC endpoint — no Clerk gate.
 *
 * Returns a sorted list of images for the given listing:
 *   - primary image first (is_primary DESC)
 *   - then by position ASC
 *   - then by created_at ASC as a deterministic tiebreaker
 *
 * Each image in the response contains { id, position, isPrimary, variants }
 * where `variants` are Cloudflare Images delivery URLs (card, thumb, detail).
 * The R2 key is an internal storage detail and is NEVER returned to clients.
 */

import type { Context } from "hono";
import { eq, desc, asc } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listingImages } from "~/lib/db/schema";
import { buildVariants } from "~/lib/server/images/variant-url";

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

type SelectableDb = {
  select: () => {
    from: (table: typeof listingImages) => {
      where: (condition: ReturnType<typeof eq>) => {
        orderBy: (
          ...columns: ReturnType<typeof desc | typeof asc>[]
        ) => Promise<ImageRow[]> | ImageRow[];
      };
    };
  };
};

export interface ListingsImagesListDeps {
  db?: SelectableDb;
  env?: { CF_IMAGES_ACCOUNT_HASH: string };
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsImagesListHandler(
  deps: ListingsImagesListDeps = {},
) {
  return async (c: Context) => {
    const listingId = c.req.param("id") ?? "";

    const env = deps.env ?? {
      CF_IMAGES_ACCOUNT_HASH: process.env.CF_IMAGES_ACCOUNT_HASH ?? "",
    };

    if (!env.CF_IMAGES_ACCOUNT_HASH) {
      logger.error("listings-images-list: missing CF_IMAGES_ACCOUNT_HASH", {
        listingId,
      });
      return c.json({ error: "internal_error" }, 500);
    }

    const db = (deps.db ?? defaultDb) as SelectableDb;

    let rows: ImageRow[];
    try {
      const result = db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(
          desc(listingImages.isPrimary),
          asc(listingImages.position),
          asc(listingImages.createdAt),
        );
      rows = await Promise.resolve(result);
    } catch (err) {
      logger.error("listings-images-list: failed to query listingImages", {
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    const images = rows.map((r) => ({
      id: r.id,
      position: r.position,
      isPrimary: r.isPrimary,
      variants: buildVariants(r.r2Key, env.CF_IMAGES_ACCOUNT_HASH),
    }));

    return c.json({ images }, 200);
  };
}
