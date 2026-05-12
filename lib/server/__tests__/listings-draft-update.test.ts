/**
 * Tests for lib/server/routes/listings-draft-update.ts
 *
 * Covers AC-4: PATCH /api/listings/draft/:id — partial update for save/resume.
 *
 * DB mock pattern:
 *   select().from().where() returns Promise.resolve([...listing rows...])
 *   update().set().where() returns Promise.resolve()
 *
 * Auth middleware is out of scope — tests set c.var.userId directly.
 */

import { Hono } from "hono";
import {
  listingsDraftUpdateHandler,
  type ListingsDraftUpdateDeps,
} from "../routes/listings-draft-update";
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

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

function buildMockDb(opts: {
  selectRows?: ListingRow[];
  shouldThrowSelect?: boolean;
  shouldThrowUpdate?: boolean;
  callLog?: string[];
}) {
  const { selectRows = [], shouldThrowSelect, shouldThrowUpdate, callLog } = opts;

  return {
    select: () => ({
      from: (_table: unknown) => ({
        where: (_cond: unknown): Promise<ListingRow[]> => {
          callLog?.push("select");
          if (shouldThrowSelect) return Promise.reject(new Error("DB select failed"));
          return Promise.resolve(selectRows);
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (_values: unknown) => ({
        where: (_cond: unknown): Promise<void> => {
          callLog?.push("update");
          if (shouldThrowUpdate) return Promise.reject(new Error("DB update failed"));
          return Promise.resolve();
        },
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsDraftUpdateDeps, userId = "user_seller_123") {
  const app = new Hono<{ Variables: AppVars }>();

  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("email", "test@example.com");
    await next();
  });

  app.patch("/api/listings/draft/:id", listingsDraftUpdateHandler(deps));

  return app;
}

function makeRequest(body: unknown) {
  return {
    method: "PATCH" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const baseListing: ListingRow = {
  id: "listing-abc",
  sellerUserId: "user_seller_123",
  status: "draft",
  series: null,
  issue: null,
  gradeCompany: null,
  gradeNumeric: null,
  priceCents: null,
  conditionNotes: null,
  catalogMatchId: null,
  publishedAt: null,
  createdAt: new Date("2026-05-01T00:00:00Z"),
  updatedAt: new Date("2026-05-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsDraftUpdateHandler", () => {
  describe("200 happy path — merge partial fields", () => {
    it("AC-4: PATCH merges partial attribute fields onto existing draft", async () => {
      const callLog: string[] = [];
      const db = buildMockDb({
        selectRows: [{ ...baseListing }],
        callLog,
      });
      const now = new Date("2026-05-12T10:00:00Z");

      const app = buildApp({
        db: db as unknown as ListingsDraftUpdateDeps["db"],
        now: () => now,
      });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Amazing Spider-Man", priceCents: 1500 }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id: string;
        series: string;
        priceCents: number;
        updatedAt: string;
      };
      expect(body.id).toBe("listing-abc");
      expect(body.series).toBe("Amazing Spider-Man");
      expect(body.priceCents).toBe(1500);
      expect(callLog).toContain("select");
      expect(callLog).toContain("update");
    });

    it("AC-4: PATCH with only catalogMatchId sets that field without touching others", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing, series: "X-Men", priceCents: 500 }],
      });

      const app = buildApp({
        db: db as unknown as ListingsDraftUpdateDeps["db"],
        now: () => new Date("2026-05-12T10:00:00Z"),
      });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ catalogMatchId: "gcd-123" }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        catalogMatchId: string;
        series: string;
        priceCents: number;
      };
      expect(body.catalogMatchId).toBe("gcd-123");
      expect(body.series).toBe("X-Men");
      expect(body.priceCents).toBe(500);
    });

    it("AC-4: PATCH with empty body (no fields) returns 200 with unchanged listing", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing, series: "Daredevil" }],
      });

      const app = buildApp({
        db: db as unknown as ListingsDraftUpdateDeps["db"],
        now: () => new Date("2026-05-12T10:00:00Z"),
      });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({}),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { series: string };
      expect(body.series).toBe("Daredevil");
    });

    it("AC-4: unknown fields in body are ignored", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing }],
      });

      const app = buildApp({
        db: db as unknown as ListingsDraftUpdateDeps["db"],
        now: () => new Date("2026-05-12T10:00:00Z"),
      });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Batman", unknownField: "ignored", malicious: true }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.series).toBe("Batman");
      expect(body.unknownField).toBeUndefined();
      expect(body.malicious).toBeUndefined();
    });
  });

  describe("403 — non-owner cannot update", () => {
    it("AC-4: PATCH returns 403 forbidden when requesting user is not the listing owner", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing, sellerUserId: "user_other_456" }],
      });

      // App uses a different userId
      const app = buildApp(
        { db: db as unknown as ListingsDraftUpdateDeps["db"] },
        "user_seller_123",
      );

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Hack attempt" }),
      );

      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("forbidden");
    });
  });

  describe("404 — listing not found", () => {
    it("returns 404 not_found when listing does not exist", async () => {
      const db = buildMockDb({ selectRows: [] });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request(
        "/api/listings/draft/nonexistent-id",
        makeRequest({ series: "Something" }),
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("not_found");
    });
  });

  describe("409 — cannot patch published listing", () => {
    it("returns 409 not_draft when listing status is published", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing, status: "published", publishedAt: new Date() }],
      });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Uncanny X-Men" }),
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("not_draft");
    });
  });

  describe("400 — invalid body", () => {
    it("returns 400 invalid_body when body is not valid JSON", async () => {
      const db = buildMockDb({ selectRows: [{ ...baseListing }] });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request("/api/listings/draft/listing-abc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_body");
    });

    it("returns 400 invalid_body when priceCents is not a number", async () => {
      const db = buildMockDb({ selectRows: [{ ...baseListing }] });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ priceCents: "not-a-number" }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_body");
    });
  });

  describe("500 — internal error", () => {
    it("returns 500 internal_error when DB select throws", async () => {
      const db = buildMockDb({ shouldThrowSelect: true });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Test" }),
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 internal_error when DB update throws", async () => {
      const db = buildMockDb({
        selectRows: [{ ...baseListing }],
        shouldThrowUpdate: true,
      });

      const app = buildApp({ db: db as unknown as ListingsDraftUpdateDeps["db"] });

      const res = await app.request(
        "/api/listings/draft/listing-abc",
        makeRequest({ series: "Test" }),
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
