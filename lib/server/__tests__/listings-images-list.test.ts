/**
 * Tests for:
 *   - lib/server/images/variant-url.ts  (buildVariants pure unit)
 *   - lib/server/routes/listings-images-list.ts  (AC-3, AC-4)
 *
 * AC-3: public image list with CF variant URLs — no R2 URL leaks
 * AC-4: images ordered primary-first, then by position
 */

import { Hono } from "hono";
import { buildVariants } from "../images/variant-url";
import {
  listingsImagesListHandler,
  type ListingsImagesListDeps,
} from "../routes/listings-images-list";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Types matching listingImages schema
// ---------------------------------------------------------------------------

type ImageRow = {
  id: string;
  listingId: string;
  r2Key: string;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal Drizzle-shaped mock for `db.select().from().where().orderBy(...)`.
 *
 * Per codebase convention (listings-gate.test.ts carry-forward):
 *   - where(...) returns Promise.resolve([...])
 *   - orderBy(...) returns Promise.resolve([...])
 */
function buildMockDb(rows: ImageRow[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: (..._args: unknown[]): Promise<ImageRow[]> =>
            Promise.resolve(rows),
        }),
      }),
    }),
  };
}

function buildThrowingDb(error: Error) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: (..._args: unknown[]): Promise<never> =>
            Promise.reject(error),
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsImagesListDeps) {
  const app = new Hono<{ Variables: AppVars }>();
  app.get("/api/listings/:id/images", listingsImagesListHandler(deps));
  return app;
}

const ACCOUNT_HASH = "test-cf-hash";
const DEFAULT_ENV = { CF_IMAGES_ACCOUNT_HASH: ACCOUNT_HASH };

// ---------------------------------------------------------------------------
// buildVariants unit tests (pure — no mocks needed)
// ---------------------------------------------------------------------------

describe("buildVariants (pure unit)", () => {
  it("returns an object with card, thumb, and detail keys", () => {
    const result = buildVariants("some-r2-key", "hash123");
    expect(Object.keys(result).sort()).toEqual(["card", "detail", "thumb"]);
  });

  it("AC-3: variants object built from CF_IMAGES_ACCOUNT_HASH, no r2 url leaks", () => {
    const r2Key = "listings/abc/original.jpg";
    const result = buildVariants(r2Key, ACCOUNT_HASH);

    // All variants must be imagedelivery.net URLs
    expect(result.card).toMatch(/^https:\/\/imagedelivery\.net\//);
    expect(result.thumb).toMatch(/^https:\/\/imagedelivery\.net\//);
    expect(result.detail).toMatch(/^https:\/\/imagedelivery\.net\//);

    // No R2 storage URL must appear — the key may appear inside CF URLs, but never as an r2cloudflarestorage.com URL
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("r2cloudflarestorage.com");
    // The result must not have any raw r2Key field
    expect(result).not.toHaveProperty("r2Key");
    expect(result).not.toHaveProperty("r2_key");
  });

  it("encodes the account hash and key in the correct URL positions", () => {
    const result = buildVariants("my-key", "my-hash");
    expect(result.card).toBe("https://imagedelivery.net/my-hash/my-key/card");
    expect(result.thumb).toBe("https://imagedelivery.net/my-hash/my-key/thumb");
    expect(result.detail).toBe("https://imagedelivery.net/my-hash/my-key/detail");
  });
});

// ---------------------------------------------------------------------------
// listingsImagesListHandler tests
// ---------------------------------------------------------------------------

describe("listingsImagesListHandler", () => {
  const baseDate = new Date("2024-01-01T00:00:00Z");

  const row1: ImageRow = {
    id: "img-1",
    listingId: "listing-abc",
    r2Key: "listings/abc/img1.jpg",
    position: 2,
    isPrimary: false,
    createdAt: baseDate,
  };

  const row2Primary: ImageRow = {
    id: "img-2",
    listingId: "listing-abc",
    r2Key: "listings/abc/img2.jpg",
    position: 1,
    isPrimary: true,
    createdAt: baseDate,
  };

  describe("200 happy path", () => {
    it("returns 200 with images array when rows exist", async () => {
      const db = buildMockDb([row2Primary, row1]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { images: unknown[] };
      expect(body).toHaveProperty("images");
      expect(Array.isArray(body.images)).toBe(true);
    });

    it("returns 200 with empty images array when no rows found", async () => {
      const db = buildMockDb([]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { images: unknown[] };
      expect(body.images).toHaveLength(0);
    });
  });

  describe("response shape", () => {
    it("each image has id, position, isPrimary, and variants with card/thumb/detail", async () => {
      const db = buildMockDb([row2Primary]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      const body = (await res.json()) as {
        images: {
          id: string;
          position: number;
          isPrimary: boolean;
          variants: { card: string; thumb: string; detail: string };
        }[];
      };

      const img = body.images[0]!;
      expect(img).toHaveProperty("id", "img-2");
      expect(img).toHaveProperty("position", 1);
      expect(img).toHaveProperty("isPrimary", true);
      expect(img.variants).toHaveProperty("card");
      expect(img.variants).toHaveProperty("thumb");
      expect(img.variants).toHaveProperty("detail");
    });

    it("AC-3: variants object built from CF_IMAGES_ACCOUNT_HASH, no r2 url leaks", async () => {
      const db = buildMockDb([row1, row2Primary]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      const rawBody = await res.text();

      // No R2 storage domain must appear in the response at all
      expect(rawBody).not.toContain("r2cloudflarestorage.com");
      // No field named r2Key or r2_key may be present
      expect(rawBody).not.toContain('"r2Key"');
      expect(rawBody).not.toContain('"r2_key"');

      // All variant URLs must be imagedelivery.net
      const body = JSON.parse(rawBody) as {
        images: { variants: Record<string, string> }[];
      };
      for (const img of body.images) {
        for (const url of Object.values(img.variants)) {
          expect(url).toMatch(/^https:\/\/imagedelivery\.net\//);
        }
      }
    });

    it("AC-4: returns images ordered primary-first then by position", async () => {
      // DB mock returns rows in the order the handler would get after DB sorts
      // (primary first, then position): row2Primary (isPrimary=true, pos=1), row1 (isPrimary=false, pos=2)
      const db = buildMockDb([row2Primary, row1]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      const body = (await res.json()) as {
        images: { id: string; isPrimary: boolean; position: number }[];
      };

      // Primary image first
      expect(body.images[0]!.id).toBe("img-2");
      expect(body.images[0]!.isPrimary).toBe(true);

      // Non-primary second, with higher position value
      expect(body.images[1]!.id).toBe("img-1");
      expect(body.images[1]!.isPrimary).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns 500 with internal_error when DB throws", async () => {
      const db = buildThrowingDb(new Error("DB connection failed"));
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: DEFAULT_ENV,
      });

      const res = await app.request("/api/listings/listing-abc/images");
      expect(res.status).toBe(500);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 when CF_IMAGES_ACCOUNT_HASH is empty (config guard)", async () => {
      const db = buildMockDb([]);
      const app = buildApp({
        db: db as unknown as ListingsImagesListDeps["db"],
        env: { CF_IMAGES_ACCOUNT_HASH: "" },
      });

      const res = await app.request("/api/listings/listing-abc/images");
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
