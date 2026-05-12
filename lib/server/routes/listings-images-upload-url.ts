/**
 * POST /api/listings/:id/images/upload-url
 *
 * Issues a SigV4 presigned PUT URL for uploading a listing image to R2.
 *
 * Contract:
 *   - Reads `c.var.userId` (set by `clerkAuth()` upstream).
 *   - Stubs an ownership gate (ownsListing returns true until listings table
 *     lands in S-2.4).
 *   - Enforces a server-side 8-image cap (400 image_limit_exceeded).
 *   - Validates contentType against allowlist (400 unsupported_content_type).
 *   - Generates a server-assigned R2 key: `${listingId}/${uuid}`.
 *   - Returns { uploadUrl, key, expiresAt } — URL is valid for 300s.
 */

import type { Context } from "hono";
import { eq } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listingImages } from "~/lib/db/schema";
import { presignR2Put, type PresignR2PutEnv } from "~/lib/server/r2/presign";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const IMAGE_CAP = 8;
const PRESIGN_TTL = 300; // seconds

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
      where: (
        condition: ReturnType<typeof eq>,
      ) => Promise<ImageRow[]>;
    };
  };
};

type PresignFn = typeof presignR2Put;

export interface ListingsImagesUploadUrlDeps {
  db?: SelectableDb;
  presign?: PresignFn;
  env?: PresignR2PutEnv;
}

// ---------------------------------------------------------------------------
// Ownership gate stub
// ---------------------------------------------------------------------------

/**
 * Stub ownership check — always grants access.
 *
 * TODO(S-2.4): replace with real listings-table lookup when listings table lands.
 * The gate's wiring contract exists here so cycle-5 integration tests can
 * swap in a mock.
 */
async function ownsListing(
  _listingId: string,
  _userId: string,
  _db: SelectableDb,
): Promise<boolean> {
  return true;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsImagesUploadUrlHandler(
  deps: ListingsImagesUploadUrlDeps = {},
) {
  return async (c: Context<{ Variables: AppVars }>) => {
    // ------------------------------------------------------------------
    // 1. Auth gate — userId must be present (set by clerkAuth upstream).
    // ------------------------------------------------------------------
    const userId: string | undefined = c.var.userId as string | undefined;
    if (!userId) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const listingId = c.req.param("id") as string;

    const db = (deps.db ?? defaultDb) as SelectableDb;
    const presign = deps.presign ?? presignR2Put;
    const env: PresignR2PutEnv = deps.env ?? {
      CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ?? "",
      CF_R2_BUCKET: process.env.CF_R2_BUCKET ?? "",
      CF_R2_ACCESS_KEY_ID: process.env.CF_R2_ACCESS_KEY_ID ?? "",
      CF_R2_SECRET_ACCESS_KEY: process.env.CF_R2_SECRET_ACCESS_KEY ?? "",
    };

    // ------------------------------------------------------------------
    // 2. Parse and validate request body.
    // ------------------------------------------------------------------
    let contentType: string | undefined;
    try {
      const body = await c.req.json<{ contentType?: unknown }>();
      contentType = typeof body?.contentType === "string" ? body.contentType : undefined;
    } catch {
      // JSON parse failure — treat as missing contentType
    }

    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return c.json({ error: "unsupported_content_type" }, 400);
    }

    // ------------------------------------------------------------------
    // 3. Ownership gate (stubbed — see ownsListing comment above).
    // ------------------------------------------------------------------
    const owns = await ownsListing(listingId, userId, db);
    if (!owns) {
      return c.json({ error: "forbidden" }, 403);
    }

    // ------------------------------------------------------------------
    // 4. Enforce 8-image cap.
    // ------------------------------------------------------------------
    let existingImages: ImageRow[];
    try {
      existingImages = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));
    } catch (err) {
      logger.error("listings-images-upload-url: failed to count images", {
        userId,
        listingId,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    if (existingImages.length >= IMAGE_CAP) {
      return c.json({ error: "image_limit_exceeded" }, 400);
    }

    // ------------------------------------------------------------------
    // 5. Generate server-assigned R2 key and presigned URL.
    // ------------------------------------------------------------------
    const uuid = crypto.randomUUID();
    const key = `${listingId}/${uuid}`;
    const expiresAt = new Date(Date.now() + PRESIGN_TTL * 1_000).toISOString();

    let uploadUrl: string;
    try {
      uploadUrl = await presign({ key, contentType, env, expiresIn: PRESIGN_TTL });
    } catch (err) {
      logger.error("listings-images-upload-url: presign failed", {
        userId,
        listingId,
        key,
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    return c.json({ uploadUrl, key, expiresAt }, 200);
  };
}
