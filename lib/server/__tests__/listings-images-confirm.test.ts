/**
 * Tests for lib/server/routes/listings-images-confirm.ts
 *
 * Covers AC-2: POST /api/listings/:id/images/confirm
 *
 * DB mock pattern: where(...) MUST return Promise.resolve([...]) per S-1.2.
 */

import { Hono } from "hono";
import {
  listingsImagesConfirmHandler,
  type ListingsImagesConfirmDeps,
} from "../routes/listings-images-confirm";
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

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

/**
 * Builds a minimal Drizzle-shaped mock for listingImages.
 *
 * callLog — mutated by update().set().where() and insert().values() calls
 * so tests can assert call order.
 *
 * selectRows — rows returned by select().from().where().
 */
function buildMockDb(
  selectRows: ImageRow[],
  opts?: {
    callLog?: string[];
    shouldThrow?: boolean;
  },
) {
  const { callLog, shouldThrow } = opts ?? {};

  return {
    select: () => ({
      from: () => ({
        where: (): Promise<ImageRow[]> => {
          if (shouldThrow) return Promise.reject(new Error("DB select failed"));
          return Promise.resolve(selectRows);
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (_values: unknown) => ({
        where: (_cond: unknown): Promise<void> => {
          callLog?.push("update:demote");
          return Promise.resolve();
        },
      }),
    }),
    insert: (_table: unknown) => ({
      values: (data: unknown): Promise<{ rows: [ImageRow] }> => {
        callLog?.push("insert");
        return Promise.resolve({
          rows: [data as ImageRow],
        });
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(
  deps: ListingsImagesConfirmDeps,
  userId = "user_test_123",
) {
  const app = new Hono<{ Variables: AppVars }>();

  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("email", "test@example.com");
    await next();
  });

  app.post("/api/listings/:id/images/confirm", listingsImagesConfirmHandler(deps));

  return app;
}

function makeRequest(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsImagesConfirmHandler", () => {
  describe("201 happy path — no isPrimary flag (first insert, auto-promoted)", () => {
    it("AC-2: first image for a listing auto-promotes to primary (no isPrimary in body)", async () => {
      const db = buildMockDb([]);
      const uuid = "test-uuid-auto-primary";

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => uuid,
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/abc.jpg" }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        listingId: string;
        r2Key: string;
        position: number;
        isPrimary: boolean;
      };
      expect(body.id).toBe(uuid);
      expect(body.listingId).toBe("listing-1");
      expect(body.r2Key).toBe("uploads/abc.jpg");
      expect(body.position).toBe(0);
      expect(body.isPrimary).toBe(true); // auto-promoted: first image
    });
  });

  describe("201 with isPrimary: true — atomic primary swap", () => {
    it("AC-2: confirm with isPrimary swaps primary atomically before insert", async () => {
      const callLog: string[] = [];
      // Simulate existing image so this is NOT the first
      const existingRows: ImageRow[] = [
        {
          id: "img-existing",
          listingId: "listing-1",
          r2Key: "uploads/existing.jpg",
          position: 0,
          isPrimary: true,
          createdAt: new Date(),
        },
      ];
      const db = buildMockDb(existingRows, { callLog });
      const uuid = "test-uuid-primary-swap";

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => uuid,
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/new-primary.jpg", isPrimary: true }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        isPrimary: boolean;
      };
      expect(body.id).toBe(uuid);
      expect(body.isPrimary).toBe(true);

      // Critical: demote update MUST come before insert
      expect(callLog).toHaveLength(2);
      expect(callLog[0]).toBe("update:demote");
      expect(callLog[1]).toBe("insert");
    });
  });

  describe("201 with isPrimary: false — non-primary insert (not first image)", () => {
    it("inserts with is_primary = false when isPrimary is explicitly false and not first image", async () => {
      const existingRows: ImageRow[] = [
        {
          id: "img-existing",
          listingId: "listing-1",
          r2Key: "uploads/existing.jpg",
          position: 0,
          isPrimary: true,
          createdAt: new Date(),
        },
      ];
      const db = buildMockDb(existingRows);
      const uuid = "test-uuid-nonprimary";

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => uuid,
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/second.jpg", isPrimary: false }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { isPrimary: boolean; position: number };
      expect(body.isPrimary).toBe(false);
      expect(body.position).toBe(1); // highest existing position (0) + 1
    });
  });

  describe("400 — image_limit_exceeded when 8 images exist", () => {
    it("returns 400 image_limit_exceeded when listing already has 8 images", async () => {
      const existingRows: ImageRow[] = Array.from({ length: 8 }, (_, i) => ({
        id: `img-${i}`,
        listingId: "listing-1",
        r2Key: `uploads/img-${i}.jpg`,
        position: i,
        isPrimary: i === 0,
        createdAt: new Date(),
      }));
      const db = buildMockDb(existingRows);

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => "unused",
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/ninth.jpg" }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("image_limit_exceeded");
    });
  });

  describe("403 — non-owner", () => {
    it("returns 403 forbidden when ownership gate returns false", async () => {
      const db = buildMockDb([]);

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => "unused",
        ownsListing: async () => false,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/photo.jpg" }),
      );

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("forbidden");
    });
  });

  describe("500 — internal error on DB throw", () => {
    it("returns 500 internal_error when DB throws during select", async () => {
      const db = buildMockDb([], { shouldThrow: true });

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => "unused",
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "uploads/photo.jpg" }),
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });

  describe("400 — invalid body", () => {
    it("returns 400 when key is missing from body", async () => {
      const db = buildMockDb([]);

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => "unused",
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ isPrimary: true }), // no key
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 when key is an empty string", async () => {
      const db = buildMockDb([]);

      const app = buildApp({
        db: db as unknown as ListingsImagesConfirmDeps["db"],
        randomUUID: () => "unused",
        ownsListing: async () => true,
      });

      const res = await app.request(
        "/api/listings/listing-1/images/confirm",
        makeRequest({ key: "" }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_body");
    });
  });
});
