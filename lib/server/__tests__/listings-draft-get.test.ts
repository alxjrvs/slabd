/**
 * Tests for lib/server/routes/listings-draft-get.ts
 *
 * Covers AC-4: GET /api/listings/draft/:id — return draft state with images joined.
 *
 * DB mock pattern:
 *   select().from().where() — first call returns listing rows, second returns image rows
 *   (separate calls for listings and listingImages tables)
 *
 * Auth middleware is out of scope — tests set c.var.userId directly.
 */

import { Hono } from "hono";
import {
  listingsDraftGetHandler,
  type ListingsDraftGetDeps,
} from "../routes/listings-draft-get";
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

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

/**
 * Builds a mock DB that serves listings on the first select().from().where() call
 * and images on the second (via .orderBy()).
 *
 * The real Drizzle query chain for images is:
 *   db.select().from(listingImages).where(...).orderBy(...)
 *
 * So `.where()` returns an object (not a Promise) that has an `.orderBy()` method,
 * and `.orderBy()` returns the Promise. For the listing fetch, `.where()` IS the Promise.
 */
function buildMockDb(opts: {
  listingRows?: ListingRow[];
  imageRows?: ImageRow[];
  shouldThrowOnListing?: boolean;
  shouldThrowOnImages?: boolean;
}) {
  const { listingRows = [], imageRows = [], shouldThrowOnListing, shouldThrowOnImages } = opts;
  let callCount = 0;

  return {
    select: () => ({
      from: (_table: unknown) => ({
        where: (_cond: unknown) => {
          callCount++;
          if (callCount === 1) {
            // First call: listing lookup — .where() IS the Promise
            if (shouldThrowOnListing) return Promise.reject(new Error("DB listing select failed"));
            return Promise.resolve(listingRows);
          }
          // Second call: images — .where() returns an object with .orderBy()
          const imagePromise = {
            orderBy: (_col: unknown): Promise<ImageRow[]> => {
              if (shouldThrowOnImages) return Promise.reject(new Error("DB images select failed"));
              return Promise.resolve(imageRows);
            },
            then: (resolve: (v: ImageRow[]) => unknown, reject: (e: unknown) => unknown) => {
              // Allow the result to also be used as a Promise directly (fallback)
              if (shouldThrowOnImages) return Promise.reject(new Error("DB images select failed")).then(resolve, reject);
              return Promise.resolve(imageRows).then(resolve, reject);
            },
          };
          return imagePromise;
        },
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsDraftGetDeps, userId = "user_seller_123") {
  const app = new Hono<{ Variables: AppVars }>();

  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("email", "test@example.com");
    await next();
  });

  app.get("/api/listings/draft/:id", listingsDraftGetHandler(deps));

  return app;
}

const baseListing: ListingRow = {
  id: "listing-xyz",
  sellerUserId: "user_seller_123",
  status: "draft",
  series: "Amazing Spider-Man",
  issue: "300",
  gradeCompany: "CGC",
  gradeNumeric: "9.8",
  priceCents: 5000,
  conditionNotes: "White pages",
  catalogMatchId: "gcd-456",
  publishedAt: null,
  createdAt: new Date("2026-05-01T00:00:00Z"),
  updatedAt: new Date("2026-05-10T00:00:00Z"),
};

const sampleImages: ImageRow[] = [
  {
    id: "img-1",
    listingId: "listing-xyz",
    r2Key: "uploads/cover.jpg",
    position: 0,
    isPrimary: true,
    createdAt: new Date("2026-05-01T01:00:00Z"),
  },
  {
    id: "img-2",
    listingId: "listing-xyz",
    r2Key: "uploads/back.jpg",
    position: 1,
    isPrimary: false,
    createdAt: new Date("2026-05-01T02:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsDraftGetHandler", () => {
  describe("200 happy path — full draft state with images", () => {
    it("AC-4: GET returns draft state with images joined and catalog_match_id", async () => {
      const db = buildMockDb({
        listingRows: [{ ...baseListing }],
        imageRows: sampleImages,
      });

      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] });

      const res = await app.request("/api/listings/draft/listing-xyz", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id: string;
        sellerUserId: string;
        status: string;
        series: string;
        issue: string;
        gradeCompany: string;
        gradeNumeric: string;
        priceCents: number;
        conditionNotes: string;
        catalogMatchId: string;
        publishedAt: null;
        images: { id: string; r2Key: string; position: number; isPrimary: boolean }[];
      };

      expect(body.id).toBe("listing-xyz");
      expect(body.sellerUserId).toBe("user_seller_123");
      expect(body.status).toBe("draft");
      expect(body.series).toBe("Amazing Spider-Man");
      expect(body.issue).toBe("300");
      expect(body.gradeCompany).toBe("CGC");
      expect(body.gradeNumeric).toBe("9.8");
      expect(body.priceCents).toBe(5000);
      expect(body.conditionNotes).toBe("White pages");
      expect(body.catalogMatchId).toBe("gcd-456");
      expect(body.publishedAt).toBeNull();
      expect(Array.isArray(body.images)).toBe(true);
      expect(body.images).toHaveLength(2);
      expect(body.images[0]).toMatchObject({
        id: "img-1",
        r2Key: "uploads/cover.jpg",
        position: 0,
        isPrimary: true,
      });
      expect(body.images[1]).toMatchObject({
        id: "img-2",
        r2Key: "uploads/back.jpg",
        position: 1,
        isPrimary: false,
      });
    });

    it("AC-4: GET returns empty images array when no images exist for the draft", async () => {
      const db = buildMockDb({
        listingRows: [{ ...baseListing }],
        imageRows: [],
      });

      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] });

      const res = await app.request("/api/listings/draft/listing-xyz", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { images: unknown[] };
      expect(body.images).toHaveLength(0);
    });
  });

  describe("403 — non-owner cannot view", () => {
    it("AC-4: GET returns 403 forbidden when requesting user is not the listing owner", async () => {
      const db = buildMockDb({
        listingRows: [{ ...baseListing, sellerUserId: "user_other_456" }],
        imageRows: [],
      });

      // userId differs from sellerUserId
      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] }, "user_seller_123");

      const res = await app.request("/api/listings/draft/listing-xyz", {
        method: "GET",
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("forbidden");
    });
  });

  describe("404 — listing not found", () => {
    it("returns 404 not_found when listing does not exist", async () => {
      const db = buildMockDb({ listingRows: [] });

      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] });

      const res = await app.request("/api/listings/draft/nonexistent-id", {
        method: "GET",
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("not_found");
    });
  });

  describe("500 — internal error", () => {
    it("returns 500 internal_error when DB throws on listing select", async () => {
      const db = buildMockDb({ shouldThrowOnListing: true });

      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] });

      const res = await app.request("/api/listings/draft/listing-xyz", {
        method: "GET",
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 internal_error when DB throws on images select", async () => {
      const db = buildMockDb({
        listingRows: [{ ...baseListing }],
        shouldThrowOnImages: true,
      });

      const app = buildApp({ db: db as unknown as ListingsDraftGetDeps["db"] });

      const res = await app.request("/api/listings/draft/listing-xyz", {
        method: "GET",
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
