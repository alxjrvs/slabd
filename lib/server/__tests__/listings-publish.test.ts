/**
 * Tests for lib/server/routes/listings-publish.ts
 *
 * Covers AC-2: POST /api/listings/:id/publish
 *
 * DB mock pattern: mirrors listings-images-confirm.test.ts
 */

import { Hono } from "hono";
import {
  listingsPublishHandler,
  type ListingsPublishDeps,
} from "../routes/listings-publish";
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

function buildMockDb(opts: {
  listing?: ListingRow | null;
  images?: ImageRow[];
  shouldThrowOnSelect?: "listing" | "images" | "both";
  shouldThrowOnUpdate?: boolean;
  updateCallLog?: string[];
}) {
  const {
    listing = null,
    images = [],
    shouldThrowOnSelect,
    shouldThrowOnUpdate = false,
    updateCallLog,
  } = opts;

  // Track which table is being selected from
  let selectCallCount = 0;

  return {
    select: () => ({
      from: (_table: unknown) => ({
        where: (): Promise<ListingRow[] | ImageRow[]> => {
          selectCallCount++;
          // First call = listings, second call = images
          const isListingSelect = selectCallCount === 1;

          if (
            shouldThrowOnSelect === "both" ||
            (shouldThrowOnSelect === "listing" && isListingSelect) ||
            (shouldThrowOnSelect === "images" && !isListingSelect)
          ) {
            return Promise.reject(new Error("DB select failed"));
          }

          if (isListingSelect) {
            return Promise.resolve(listing ? [listing] : []) as Promise<ListingRow[]>;
          } else {
            return Promise.resolve(images) as Promise<ImageRow[]>;
          }
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (_values: unknown) => ({
        where: (_cond: unknown): Promise<void> => {
          updateCallLog?.push("update:listing");
          if (shouldThrowOnUpdate) return Promise.reject(new Error("DB update failed"));
          return Promise.resolve();
        },
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsPublishDeps, userId = "user_test_123") {
  const app = new Hono<{ Variables: AppVars }>();

  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("email", "test@example.com");
    await next();
  });

  app.post("/api/listings/:id/publish", listingsPublishHandler(deps));

  return app;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SELLER_ID = "user_test_123";
const OTHER_USER_ID = "user_other_456";

function makeDraftListing(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "listing-1",
    sellerUserId: SELLER_ID,
    status: "draft",
    series: "Amazing Spider-Man",
    issue: "300",
    gradeCompany: "CGC",
    gradeNumeric: "9.8",
    priceCents: 500,
    conditionNotes: null,
    catalogMatchId: null,
    publishedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeImage(i: number): ImageRow {
  return {
    id: `img-${i}`,
    listingId: "listing-1",
    r2Key: `uploads/img-${i}.jpg`,
    position: i,
    isPrimary: i === 0,
    createdAt: new Date("2026-01-01"),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsPublishHandler", () => {
  // -------------------------------------------------------------------------
  // 404 — listing not found
  // -------------------------------------------------------------------------
  describe("404 — listing not found", () => {
    it("returns 404 not_found when listing does not exist", async () => {
      const db = buildMockDb({ listing: null });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-missing/publish", {
        method: "POST",
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("not_found");
    });
  });

  // -------------------------------------------------------------------------
  // 403 — non-owner
  // -------------------------------------------------------------------------
  describe("403 — non-owner", () => {
    it("returns 403 forbidden when caller does not own the listing", async () => {
      const db = buildMockDb({ listing: makeDraftListing({ sellerUserId: OTHER_USER_ID }) });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("forbidden");
    });
  });

  // -------------------------------------------------------------------------
  // 409 — not draft
  // -------------------------------------------------------------------------
  describe("409 — not draft", () => {
    it("AC-2: returns 409 not_draft when listing is already published", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ status: "published", publishedAt: new Date("2026-02-01") }),
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; currentStatus: string };
      expect(body.error).toBe("not_draft");
      expect(body.currentStatus).toBe("published");
    });

    it("returns 409 not_draft when listing is sold", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ status: "sold" }),
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; currentStatus: string };
      expect(body.error).toBe("not_draft");
      expect(body.currentStatus).toBe("sold");
    });
  });

  // -------------------------------------------------------------------------
  // 422 — validation_failed
  // -------------------------------------------------------------------------
  describe("422 — validation_failed", () => {
    it("AC-2: returns 422 validation_failed with field map when series is missing", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ series: null }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.series).toBe("missing");
    });

    it("returns 422 when issue is missing", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ issue: null }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.issue).toBe("missing");
    });

    it("returns 422 when grade_company is invalid (not Raw/CGC/CBCS)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeCompany: "PGX" }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.grade_company).toBe("invalid");
    });

    it("returns 422 when grade_company is null (missing)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeCompany: null }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.grade_company).toBe("missing");
    });

    it("returns 422 when grade_numeric is out of range (> 10.0)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeNumeric: "10.5" }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.grade_numeric).toBe("invalid");
    });

    it("returns 422 when grade_numeric is out of range (< 0.5)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeNumeric: "0.0" }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.grade_numeric).toBe("invalid");
    });

    it("returns 422 when price_cents is below minimum (< 100)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ priceCents: 50 }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.price_cents).toBe("invalid");
    });

    it("returns 422 when price_cents is null (missing)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ priceCents: null }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.price_cents).toBe("missing");
    });

    it("AC-2: returns 422 with images_count=insufficient when only 1 image exists", async () => {
      const db = buildMockDb({
        listing: makeDraftListing(),
        images: [makeImage(0)],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.images_count).toBe("insufficient");
    });

    it("returns 422 with images_count=missing when no images exist", async () => {
      const db = buildMockDb({
        listing: makeDraftListing(),
        images: [],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.images_count).toBe("missing");
    });

    it("accumulates multiple field errors in one 422 response", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ series: null, issue: null, priceCents: null }),
        images: [],
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(422);
      const body = (await res.json()) as { error: string; fields: Record<string, string> };
      expect(body.error).toBe("validation_failed");
      expect(body.fields.series).toBe("missing");
      expect(body.fields.issue).toBe("missing");
      expect(body.fields.price_cents).toBe("missing");
      expect(body.fields.images_count).toBe("missing");
    });
  });

  // -------------------------------------------------------------------------
  // 200 — happy path
  // -------------------------------------------------------------------------
  describe("200 — happy path", () => {
    it("AC-2: happy path publishes a complete draft with 2+ images and returns published listing", async () => {
      const fixedNow = new Date("2026-05-12T10:00:00.000Z");
      const updateCallLog: string[] = [];

      const db = buildMockDb({
        listing: makeDraftListing(),
        images: [makeImage(0), makeImage(1)],
        updateCallLog,
      });

      const app = buildApp({
        db: db as unknown as ListingsPublishDeps["db"],
        now: () => fixedNow,
      });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id: string;
        status: string;
        publishedAt: string;
        updatedAt: string;
        sellerUserId: string;
        series: string;
        issue: string;
        gradeCompany: string;
        gradeNumeric: string;
        priceCents: number;
      };
      expect(body.id).toBe("listing-1");
      expect(body.status).toBe("published");
      expect(body.publishedAt).toBe(fixedNow.toISOString());
      expect(body.updatedAt).toBe(fixedNow.toISOString());
      expect(body.sellerUserId).toBe(SELLER_ID);
      expect(body.series).toBe("Amazing Spider-Man");
      expect(body.gradeCompany).toBe("CGC");
      expect(body.priceCents).toBe(500);

      // DB update was called
      expect(updateCallLog).toContain("update:listing");
    });

    it("accepts grade_numeric as a numeric string from DB (coerces correctly)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeNumeric: "9.8" }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({
        db: db as unknown as ListingsPublishDeps["db"],
        now: () => new Date("2026-05-12T10:00:00.000Z"),
      });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(200);
    });

    it("accepts grade_company Raw as valid", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ gradeCompany: "Raw" }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({
        db: db as unknown as ListingsPublishDeps["db"],
        now: () => new Date("2026-05-12T10:00:00.000Z"),
      });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(200);
    });

    it("accepts price_cents exactly 100 (minimum valid)", async () => {
      const db = buildMockDb({
        listing: makeDraftListing({ priceCents: 100 }),
        images: [makeImage(0), makeImage(1)],
      });
      const app = buildApp({
        db: db as unknown as ListingsPublishDeps["db"],
        now: () => new Date("2026-05-12T10:00:00.000Z"),
      });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // 500 — internal errors
  // -------------------------------------------------------------------------
  describe("500 — internal error on DB throw", () => {
    it("returns 500 internal_error when DB throws during listing select", async () => {
      const db = buildMockDb({ shouldThrowOnSelect: "listing" });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 internal_error when DB throws during images select", async () => {
      const db = buildMockDb({
        listing: makeDraftListing(),
        shouldThrowOnSelect: "images",
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 internal_error when DB throws during update", async () => {
      const db = buildMockDb({
        listing: makeDraftListing(),
        images: [makeImage(0), makeImage(1)],
        shouldThrowOnUpdate: true,
      });
      const app = buildApp({ db: db as unknown as ListingsPublishDeps["db"] });

      const res = await app.request("/api/listings/listing-1/publish", { method: "POST" });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
