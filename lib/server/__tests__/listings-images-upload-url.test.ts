/**
 * Tests for lib/server/routes/listings-images-upload-url.ts
 *
 * Covers:
 * - AC-1: returns signed upload URL with content-type pinned
 * - 400 image_limit_exceeded when >= 8 images already exist
 * - 400 unsupported_content_type for disallowed MIME types
 * - 401 when userId is absent (no clerkAuth)
 * - 500 internal_error when presigner throws
 */

import { Hono } from "hono";
import {
  listingsImagesUploadUrlHandler,
  type ListingsImagesUploadUrlDeps,
} from "../routes/listings-images-upload-url";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Mock DB helpers
// ---------------------------------------------------------------------------

/** Build a mock db that returns `count` image rows for the listingImages query. */
function buildMockDb(imageCount: number, throwOnQuery = false) {
  const rows = Array.from({ length: imageCount }, (_, i) => ({
    id: `img-${i}`,
    listingId: "listing-123",
    r2Key: `listing-123/key-${i}`,
    position: i,
    isPrimary: i === 0,
    createdAt: new Date(),
  }));

  return {
    select: () => ({
      from: () => ({
        where: (): Promise<typeof rows> => {
          if (throwOnQuery) return Promise.reject(new Error("DB query failed"));
          return Promise.resolve(rows);
        },
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock presigner
// ---------------------------------------------------------------------------

const MOCK_UPLOAD_URL = "https://mock-r2.example.com/listing-123/some-uuid?X-Amz-Signature=abc";

function buildMockPresign(throws = false): jest.Mock {
  if (throws) {
    return jest.fn().mockRejectedValue(new Error("presign network error"));
  }
  return jest.fn().mockResolvedValue(MOCK_UPLOAD_URL);
}

// ---------------------------------------------------------------------------
// Test env
// ---------------------------------------------------------------------------

const TEST_ENV = {
  CF_ACCOUNT_ID: "test-account-id",
  CF_R2_BUCKET: "test-bucket",
  CF_R2_ACCESS_KEY_ID: "test-key-id",
  CF_R2_SECRET_ACCESS_KEY: "test-secret-key",
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function buildApp(
  deps: ListingsImagesUploadUrlDeps,
  injectUserId: string | null = "user_test_123",
) {
  const app = new Hono<{ Variables: AppVars }>();

  // Inject userId as if clerkAuth() ran (or skip for auth-failure tests)
  app.use("*", async (c, next) => {
    if (injectUserId !== null) {
      c.set("userId", injectUserId);
      c.set("email", "test@example.com");
    }
    await next();
  });

  app.post(
    "/api/listings/:id/images/upload-url",
    listingsImagesUploadUrlHandler(deps),
  );

  return app;
}

function makeRequest(
  app: ReturnType<typeof buildApp>,
  listingId = "listing-123",
  body: Record<string, unknown> = { contentType: "image/jpeg" },
) {
  return app.request(
    `/api/listings/${listingId}/images/upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listingsImagesUploadUrlHandler", () => {
  describe("AC-1: returns signed upload URL with content-type pinned", () => {
    it("AC-1: returns signed upload URL with content-type pinned", async () => {
      const presign = buildMockPresign();
      const db = buildMockDb(0);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(200);

      const body = await res.json() as { uploadUrl: string; key: string; expiresAt: string };
      expect(body.uploadUrl).toBe(MOCK_UPLOAD_URL);
      expect(typeof body.key).toBe("string");
      // Key shape: listingId/uuid
      expect(body.key).toMatch(/^listing-123\/.+$/);
      // expiresAt is an ISO timestamp ~300s in the future
      expect(typeof body.expiresAt).toBe("string");
      const expiresAt = new Date(body.expiresAt).getTime();
      expect(expiresAt).toBeGreaterThan(Date.now() + 290_000);
      expect(expiresAt).toBeLessThan(Date.now() + 310_000);

      // Presigner was called with the correct content type
      expect(presign).toHaveBeenCalledTimes(1);
      const presignArgs = presign.mock.calls[0][0] as {
        key: string;
        contentType: string;
        expiresIn: number;
      };
      expect(presignArgs.contentType).toBe("image/jpeg");
      expect(presignArgs.expiresIn).toBe(300);
    });

    it("AC-1: accepts all allowed content types", async () => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      for (const contentType of allowedTypes) {
        const presign = buildMockPresign();
        const db = buildMockDb(0);
        const app = buildApp({
          db: db as unknown as ListingsImagesUploadUrlDeps["db"],
          presign,
          env: TEST_ENV,
        });

        const res = await makeRequest(app, "listing-123", { contentType });
        expect(res.status).toBe(200);
      }
    });
  });

  describe("400 image_limit_exceeded", () => {
    it("returns 400 with image_limit_exceeded when 8 images already exist", async () => {
      const presign = buildMockPresign();
      const db = buildMockDb(8);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("image_limit_exceeded");
      // presigner must NOT have been called
      expect(presign).not.toHaveBeenCalled();
    });

    it("returns 400 with image_limit_exceeded when more than 8 images already exist", async () => {
      const db = buildMockDb(10);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign: buildMockPresign(),
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("image_limit_exceeded");
    });

    it("allows exactly 7 images (one below cap)", async () => {
      const presign = buildMockPresign();
      const db = buildMockDb(7);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(200);
    });
  });

  describe("400 unsupported_content_type", () => {
    it("returns 400 with unsupported_content_type for image/gif", async () => {
      const presign = buildMockPresign();
      const db = buildMockDb(0);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env: TEST_ENV,
      });

      const res = await makeRequest(app, "listing-123", { contentType: "image/gif" });
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("unsupported_content_type");
      expect(presign).not.toHaveBeenCalled();
    });

    it("returns 400 with unsupported_content_type for application/pdf", async () => {
      const presign = buildMockPresign();
      const db = buildMockDb(0);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env: TEST_ENV,
      });

      const res = await makeRequest(app, "listing-123", { contentType: "application/pdf" });
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("unsupported_content_type");
    });

    it("returns 400 when contentType is missing from body", async () => {
      const db = buildMockDb(0);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign: buildMockPresign(),
        env: TEST_ENV,
      });

      const res = await makeRequest(app, "listing-123", {});
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("unsupported_content_type");
    });
  });

  describe("401 unauthorised on missing userId", () => {
    it("returns 401 when userId is not set in context (no clerkAuth)", async () => {
      const db = buildMockDb(0);
      // Pass null to skip userId injection
      const app = buildApp(
        {
          db: db as unknown as ListingsImagesUploadUrlDeps["db"],
          presign: buildMockPresign(),
          env: TEST_ENV,
        },
        null,
      );

      const res = await makeRequest(app);
      expect(res.status).toBe(401);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("unauthorized");
    });
  });

  describe("500 internal_error on presigner throw", () => {
    it("returns 500 with internal_error when presigner rejects", async () => {
      const db = buildMockDb(0);
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign: buildMockPresign(true), // throws
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("internal_error");
    });

    it("returns 500 with internal_error when DB query rejects", async () => {
      const db = buildMockDb(0, true); // throws on query
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign: buildMockPresign(),
        env: TEST_ENV,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });

  describe("500 internal_error on missing R2 env (config guard)", () => {
    it.each([
      ["CF_ACCOUNT_ID"],
      ["CF_R2_BUCKET"],
      ["CF_R2_ACCESS_KEY_ID"],
      ["CF_R2_SECRET_ACCESS_KEY"],
    ] as const)("returns 500 when %s is empty", async (missingVar) => {
      const presign = buildMockPresign();
      const db = buildMockDb(0);
      const env = { ...TEST_ENV, [missingVar]: "" };
      const app = buildApp({
        db: db as unknown as ListingsImagesUploadUrlDeps["db"],
        presign,
        env,
      });

      const res = await makeRequest(app);
      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("internal_error");
      // Guard must short-circuit BEFORE the presigner is touched.
      expect(presign).not.toHaveBeenCalled();
    });
  });
});
