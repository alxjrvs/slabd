/**
 * Tests for lib/server/routes/listings-draft-create.ts
 *
 * Covers AC-1: POST /api/listings/draft
 *
 * DB mock pattern: insert().values() returns Promise.resolve({rows:[...]}).
 * Auth/onboarding middleware is out of scope — tests set c.var.userId directly.
 */

import { Hono } from "hono";
import {
  listingsDraftCreateHandler,
  type ListingsDraftCreateDeps,
} from "../routes/listings-draft-create";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

function buildMockDb(opts?: { shouldThrow?: boolean }) {
  const { shouldThrow } = opts ?? {};

  return {
    insert: (_table: unknown) => ({
      values: (_data: unknown): Promise<{ rows: unknown[] }> => {
        if (shouldThrow) return Promise.reject(new Error("DB insert failed"));
        return Promise.resolve({ rows: [_data] });
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsDraftCreateDeps, userId = "user_test_123") {
  const app = new Hono<{ Variables: AppVars }>();

  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("email", "test@example.com");
    await next();
  });

  app.post("/api/listings/draft", listingsDraftCreateHandler(deps));

  return app;
}

function makeRequest(body?: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsDraftCreateHandler", () => {
  describe("201 happy path", () => {
    it("AC-1: signed-in onboarded seller can POST /api/listings/draft and receives 201 with id", async () => {
      const uuid = "test-draft-uuid-001";
      const db = buildMockDb();

      const app = buildApp({
        db: db as unknown as ListingsDraftCreateDeps["db"],
        randomUUID: () => uuid,
        now: () => new Date("2026-05-12T00:00:00Z"),
      });

      const res = await app.request("/api/listings/draft", makeRequest({}));

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(uuid);
    });

    it("AC-1: works with an empty body (no fields required at create time)", async () => {
      const uuid = "test-draft-uuid-002";
      const db = buildMockDb();

      const app = buildApp({
        db: db as unknown as ListingsDraftCreateDeps["db"],
        randomUUID: () => uuid,
      });

      const res = await app.request(
        "/api/listings/draft",
        makeRequest({}),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(uuid);
    });

    it("AC-1: draft is created with status=draft and sellerUserId from context", async () => {
      const uuid = "test-draft-uuid-003";
      const userId = "user_seller_abc";
      let insertedData: unknown = null;

      const db = {
        insert: (_table: unknown) => ({
          values: (data: unknown): Promise<{ rows: unknown[] }> => {
            insertedData = data;
            return Promise.resolve({ rows: [data] });
          },
        }),
      };

      const app = buildApp(
        {
          db: db as unknown as ListingsDraftCreateDeps["db"],
          randomUUID: () => uuid,
          now: () => new Date("2026-05-12T00:00:00Z"),
        },
        userId,
      );

      await app.request("/api/listings/draft", makeRequest({}));

      expect(insertedData).toMatchObject({
        id: uuid,
        sellerUserId: userId,
        status: "draft",
      });
    });
  });

  describe("400 — invalid body", () => {
    it("returns 400 invalid_body when body is not valid JSON", async () => {
      const db = buildMockDb();

      const app = buildApp({
        db: db as unknown as ListingsDraftCreateDeps["db"],
        randomUUID: () => "unused",
      });

      const res = await app.request("/api/listings/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_body");
    });
  });

  describe("500 — internal error on DB throw", () => {
    it("returns 500 internal_error when DB insert throws", async () => {
      const db = buildMockDb({ shouldThrow: true });

      const app = buildApp({
        db: db as unknown as ListingsDraftCreateDeps["db"],
        randomUUID: () => "unused",
      });

      const res = await app.request("/api/listings/draft", makeRequest({}));

      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
