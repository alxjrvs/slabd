/**
 * End-to-end integration test for the listing images upload flow.
 *
 * Walks: upload-url → confirm → list (AC-5 close-out).
 *
 * Uses Jest globals — do NOT import from bun:test.
 */

import type { JSONWebKeySet } from "jose";

import { createApp, type CreateAppOptions } from "../app";
import { buildJwks, type JwksFixture } from "./_jwks-helpers";
import { __resetJwksCacheForTests } from "../middleware/clerk-auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user_images_integration_1";
const TEST_LISTING_ID = "listing-123";
const CF_IMAGES_ACCOUNT_HASH = "test-account-hash-abc";
const CF_ACCOUNT_ID = "test-cf-account";
const CF_R2_BUCKET = "test-bucket";
const CF_R2_ACCESS_KEY_ID = "test-key-id";
const CF_R2_SECRET_ACCESS_KEY = "test-secret";

// ---------------------------------------------------------------------------
// Image row type
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
// In-memory DB mock for listing images
//
// Supports the query shapes used by all three handlers:
//
//   upload-url:  select().from().where()         → Promise<ImageRow[]>
//   confirm:     select().from().where()          → Promise<ImageRow[]>
//                update().set().where()           → Promise<void>
//                insert().values()               → Promise<unknown>
//   list:        select().from().where().orderBy() → Promise<ImageRow[]>
//
// ---------------------------------------------------------------------------

function buildImagesDb() {
  const store: ImageRow[] = [];

  const db = {
    /** Exposed for test assertions. */
    store,

    select: jest.fn().mockImplementation(() => ({
      from: jest.fn().mockImplementation((_table: unknown) => ({
        where: jest.fn().mockImplementation((condition: unknown) => {
          // Extract the listingId value from the eq() condition.
          // Drizzle eq() AST: queryChunks[3].value holds the bound value.
          type EqChunk = { name?: string; value?: unknown };
          type EqCondition = { queryChunks?: EqChunk[] };
          const cond = condition as EqCondition;
          const val = cond.queryChunks?.[3]?.value;
          const listingId = typeof val === "string" && val !== "" ? val : undefined;

          const rows = listingId
            ? store.filter((r) => r.listingId === listingId)
            : [...store];

          // Support both .where() → Promise (upload-url, confirm) and
          // .where().orderBy() → Promise (list handler).
          const rowsPromise = Promise.resolve(rows);

          // Attach .orderBy() so the list handler's fluent chain works.
          (rowsPromise as unknown as Record<string, unknown>).orderBy = jest
            .fn()
            .mockImplementation(
              (..._cols: unknown[]) => Promise.resolve([...rows].sort((a, b) => {
                // primary first, then position, then createdAt
                if (b.isPrimary !== a.isPrimary) return b.isPrimary ? 1 : -1;
                if (a.position !== b.position) return a.position - b.position;
                return a.createdAt.getTime() - b.createdAt.getTime();
              })),
            );

          return rowsPromise;
        }),
      })),
    })),

    insert: jest.fn().mockImplementation((_table: unknown) => ({
      values: jest.fn().mockImplementation((data: ImageRow) => {
        store.push({ ...data });
        return Promise.resolve(undefined);
      }),
    })),

    update: jest.fn().mockImplementation((_table: unknown) => ({
      set: jest.fn().mockImplementation((values: Partial<ImageRow>) => ({
        where: jest.fn().mockImplementation((_condition: unknown) => {
          // Demote existing primary images for the listing.
          for (const row of store) {
            if (row.isPrimary) {
              Object.assign(row, values);
            }
          }
          return Promise.resolve(undefined);
        }),
      })),
    })),
  };

  return db;
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

async function buildTestJwt(fixture: JwksFixture, userId: string): Promise<string> {
  return fixture.signJwt({ sub: userId, email: `${userId}@test.example.com` });
}

// ---------------------------------------------------------------------------
// Presign mock
// ---------------------------------------------------------------------------

function buildMockPresign() {
  return jest.fn().mockImplementation(
    async ({ key, contentType }: { key: string; contentType: string; env: unknown; expiresIn: number }) => {
      return `https://test-bucket.r2.cloudflarestorage.com/${key}?content-type=${contentType}&X-Amz-Expires=300&mock=1`;
    },
  );
}

// ---------------------------------------------------------------------------
// beforeEach — reset JWKS cache to prevent test bleed
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetJwksCacheForTests();
});

// ---------------------------------------------------------------------------
// AC-5: End-to-end walk
// ---------------------------------------------------------------------------

it("AC-5: end-to-end upload-url → confirm → list walk", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);

  const db = buildImagesDb();
  const mockPresign = buildMockPresign();

  const appOptions: CreateAppOptions = {
    fetchJwks,
    listingsImagesUploadUrlDeps: {
      db: db as any,
      presign: mockPresign,
      env: {
        CF_ACCOUNT_ID,
        CF_R2_BUCKET,
        CF_R2_ACCESS_KEY_ID,
        CF_R2_SECRET_ACCESS_KEY,
      },
    },
    listingsImagesConfirmDeps: {
      db: db as any,
      randomUUID: jest.fn().mockReturnValue("fixed-uuid-1234"),
    },
    listingsImagesListDeps: {
      db: db as any,
      env: { CF_IMAGES_ACCOUNT_HASH },
    },
  };

  const app = createApp(appOptions);
  const jwt = await buildTestJwt(jwksFixture, TEST_USER_ID);
  const authHeader = `Bearer ${jwt}`;

  // -------------------------------------------------------------------------
  // Step 1 — POST /api/listings/:id/images/upload-url
  // Expect 200 with { uploadUrl, key, expiresAt }
  // -------------------------------------------------------------------------

  const uploadUrlRes = await app.request(
    `/api/listings/${TEST_LISTING_ID}/images/upload-url`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({ contentType: "image/jpeg" }),
    },
  );

  expect(uploadUrlRes.status).toBe(200);

  const uploadUrlBody = (await uploadUrlRes.json()) as {
    uploadUrl: string;
    key: string;
    expiresAt: string;
  };
  expect(typeof uploadUrlBody.uploadUrl).toBe("string");
  expect(uploadUrlBody.uploadUrl.length).toBeGreaterThan(0);
  expect(typeof uploadUrlBody.key).toBe("string");
  expect(uploadUrlBody.key.length).toBeGreaterThan(0);
  expect(typeof uploadUrlBody.expiresAt).toBe("string");

  const capturedKey = uploadUrlBody.key;

  // -------------------------------------------------------------------------
  // Step 2 — POST /api/listings/:id/images/confirm
  // Expect 201 with isPrimary === true (first image auto-promoted)
  // -------------------------------------------------------------------------

  // Need a fresh JWT since clerkAuth validates each request independently.
  const jwt2 = await buildTestJwt(jwksFixture, TEST_USER_ID);

  const confirmRes = await app.request(
    `/api/listings/${TEST_LISTING_ID}/images/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt2}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ key: capturedKey, isPrimary: true }),
    },
  );

  expect(confirmRes.status).toBe(201);

  const confirmBody = (await confirmRes.json()) as {
    id: string;
    listingId: string;
    r2Key: string;
    position: number;
    isPrimary: boolean;
    createdAt: string;
  };
  expect(confirmBody.isPrimary).toBe(true);
  expect(confirmBody.r2Key).toBe(capturedKey);
  expect(confirmBody.listingId).toBe(TEST_LISTING_ID);

  // -------------------------------------------------------------------------
  // Step 3 — GET /api/listings/:id/images (public — no auth header)
  // Expect 200, array contains the confirmed image, no R2 URL leak
  // -------------------------------------------------------------------------

  const listRes = await app.request(
    `/api/listings/${TEST_LISTING_ID}/images`,
    {
      method: "GET",
      // intentionally NO Authorization header — public endpoint
    },
  );

  expect(listRes.status).toBe(200);

  const listBody = (await listRes.json()) as {
    images: {
      id: string;
      position: number;
      isPrimary: boolean;
      variants: Record<string, string>;
    }[];
  };

  expect(Array.isArray(listBody.images)).toBe(true);
  expect(listBody.images.length).toBeGreaterThan(0);

  const firstImage = listBody.images[0];
  expect(firstImage?.isPrimary).toBe(true);
  expect(typeof firstImage?.variants.card).toBe("string");
  expect(typeof firstImage?.variants.thumb).toBe("string");
  expect(typeof firstImage?.variants.detail).toBe("string");

  // R2 URL leak guard — response must not contain the internal R2 domain.
  const responseText = JSON.stringify(listBody);
  expect(responseText).not.toContain("r2.cloudflarestorage.com");
});
