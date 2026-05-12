/**
 * End-to-end integration test for the S-2.4 seller listing lifecycle.
 *
 * Walks: draft-create → draft-update → draft-get → publish → public index.
 *
 * Uses Jest globals — do NOT import from bun:test.
 *
 * Covers:
 *   AC-1: draft persists across resume (PATCH + GET returns patched values)
 *   AC-5: public listings index returns published listings without auth
 */

import type { JSONWebKeySet } from "jose";

import { createApp, type CreateAppOptions } from "../app";
import { buildJwks, type JwksFixture } from "./_jwks-helpers";
import { __resetJwksCacheForTests } from "../middleware/clerk-auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user_lifecycle_integration_1";

// ---------------------------------------------------------------------------
// In-memory row types
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

type SellerAccountRow = {
  userId: string;
  onboardingStatus: string;
};

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

type Store = {
  listings: ListingRow[];
  images: ImageRow[];
  sellerAccounts: SellerAccountRow[];
};

// ---------------------------------------------------------------------------
// Drizzle condition introspection helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the bound value from a Drizzle `eq()` condition.
 * Drizzle AST: queryChunks[3].value holds the literal.
 */
function extractEqValue(condition: unknown): unknown {
  type EqChunk = { name?: string; value?: unknown };
  type EqCondition = { queryChunks?: EqChunk[] };
  const cond = condition as EqCondition;
  return cond.queryChunks?.[3]?.value;
}

/**
 * Extracts the column name from a Drizzle `eq()` condition.
 * queryChunks[1] is the column reference; its `name` property is the camelCase JS name.
 */
function extractEqColumn(condition: unknown): string | undefined {
  type EqChunk = { name?: string; value?: unknown; columnType?: string };
  type EqCondition = { queryChunks?: EqChunk[] };
  const cond = condition as EqCondition;
  return cond.queryChunks?.[1]?.name;
}

// ---------------------------------------------------------------------------
// Unified in-memory DB builder
//
// One shared store, one mock DB object that all five handler dep sets point at.
//
// Query shapes supported:
//   listings insert:   insert(table).values(row)
//   listings select:   select().from(table).where(cond)
//   listings select:   select().from(table).where(cond).orderBy(...).limit(n).offset(n)
//   listings count:    select({count}).from(table).where(cond)
//   listings update:   update(table).set(values).where(cond)
//   images select:     select().from(table).where(cond).orderBy(...)
//   images insert:     insert(table).values(row)
//   sellerAccounts:    select().from(table).where(cond)  [for requireSellerOnboarded]
// ---------------------------------------------------------------------------

function buildUnifiedDb(store: Store) {
  // We need to distinguish which table is being queried. Drizzle table objects
  // have a Symbol that carries table metadata. We use a duck-typed name check.
  function tableName(table: unknown): "listings" | "images" | "sellerAccounts" | "unknown" {
    if (typeof table !== "object" || table === null) return "unknown";
    // Drizzle pgTable stores the table name in [Symbol(drizzle:Name)]
    const sym = Object.getOwnPropertySymbols(table).find(
      (s) => s.toString() === "Symbol(drizzle:Name)",
    );
    if (!sym) return "unknown";
    const name = (table as Record<symbol, unknown>)[sym];
    if (name === "listings") return "listings";
    if (name === "images") return "images";
    if (name === "seller_accounts") return "sellerAccounts";
    return "unknown";
  }

  const db = {
    _store: store,

    // ---- INSERT ----
    insert: jest.fn().mockImplementation((_table: unknown) => ({
      values: jest.fn().mockImplementation((data: unknown) => {
        const tname = tableName(_table);
        if (tname === "listings") {
          store.listings.push({ ...(data as ListingRow) });
        } else if (tname === "images") {
          store.images.push({ ...(data as ImageRow) });
        }
        return Promise.resolve(undefined);
      }),
    })),

    // ---- UPDATE ----
    update: jest.fn().mockImplementation((_table: unknown) => ({
      set: jest.fn().mockImplementation((values: Partial<ListingRow>) => ({
        where: jest.fn().mockImplementation((condition: unknown) => {
          const idValue = extractEqValue(condition) as string | undefined;
          for (const row of store.listings) {
            if (row.id === idValue) {
              Object.assign(row, values);
            }
          }
          return Promise.resolve(undefined);
        }),
      })),
    })),

    // ---- SELECT (overloaded) ----
    //
    // Two call signatures:
    //   select()               → list/count queries
    //   select({ count })      → count queries
    //
    // We detect the count shape by checking whether `fields` has a `count` key.
    select: jest.fn().mockImplementation((fields?: unknown) => {
      const isCountQuery =
        fields !== null &&
        typeof fields === "object" &&
        "count" in (fields as object);

      return {
        from: jest.fn().mockImplementation((_table: unknown) => {
          const tname = tableName(_table);

          return {
            where: jest.fn().mockImplementation((condition: unknown) => {
              // Resolve the rows based on the table + condition
              const colName = extractEqColumn(condition);
              const val = extractEqValue(condition);

              let matchedListings: ListingRow[] = [];
              let matchedImages: ImageRow[] = [];
              let matchedSellers: SellerAccountRow[] = [];

              if (tname === "listings") {
                matchedListings = store.listings.filter((r) => {
                  if (colName === "id") return r.id === val;
                  if (colName === "status") return r.status === val;
                  return true;
                });
              } else if (tname === "images") {
                matchedImages = store.images.filter((r) => {
                  if (colName === "listingId") return r.listingId === val;
                  if (colName === "id") return r.id === val;
                  return true;
                });
              } else if (tname === "sellerAccounts") {
                matchedSellers = store.sellerAccounts.filter((r) => {
                  if (colName === "userId") return r.userId === val;
                  return true;
                });
              }

              if (isCountQuery) {
                // Return count rows
                const cnt = tname === "listings" ? matchedListings.length : 0;
                return Promise.resolve([{ count: cnt }]);
              }

              // Standard select — resolve based on table
              if (tname === "listings") {
                const rowsPromise = Promise.resolve([...matchedListings]) as Promise<ListingRow[]> & {
                  orderBy: (...args: unknown[]) => {
                    limit: (n: number) => { offset: (n: number) => Promise<ListingRow[]> };
                  };
                };

                // Attach .orderBy().limit().offset() chain for listings-list handler
                rowsPromise.orderBy = jest.fn().mockImplementation(
                  (..._cols: unknown[]) => {
                    const sorted = [...matchedListings].sort((a, b) => {
                      const aT = a.publishedAt?.getTime() ?? 0;
                      const bT = b.publishedAt?.getTime() ?? 0;
                      return bT - aT; // desc
                    });
                    return {
                      limit: jest.fn().mockImplementation((_limit: number) => ({
                        offset: jest.fn().mockImplementation((_offset: number) =>
                          Promise.resolve(sorted.slice(_offset, _offset + _limit)),
                        ),
                      })),
                    };
                  },
                );

                return rowsPromise;
              }

              if (tname === "images") {
                const rowsPromise = Promise.resolve([...matchedImages]) as Promise<ImageRow[]> & {
                  orderBy: (...args: unknown[]) => Promise<ImageRow[]>;
                };

                // Attach .orderBy() for draft-get handler
                rowsPromise.orderBy = jest.fn().mockImplementation(
                  (..._cols: unknown[]) =>
                    Promise.resolve(
                      [...matchedImages].sort((a, b) => a.position - b.position),
                    ),
                );

                return rowsPromise;
              }

              if (tname === "sellerAccounts") {
                return Promise.resolve([...matchedSellers]);
              }

              return Promise.resolve([]);
            }),
          };
        }),
      };
    }),
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
// beforeEach — reset JWKS cache to prevent test bleed
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetJwksCacheForTests();
});

// ---------------------------------------------------------------------------
// Listings lifecycle (S-2.4 integration walk)
// ---------------------------------------------------------------------------

describe("listings lifecycle (S-2.4 integration walk)", () => {
  it("AC-1 + AC-5: full lifecycle — draft create, update, get, publish, public index", async () => {
    const jwksFixture = await buildJwks();
    const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);

    const store: Store = {
      listings: [],
      images: [],
      sellerAccounts: [
        { userId: TEST_USER_ID, onboardingStatus: "complete" },
      ],
    };

    const db = buildUnifiedDb(store);

    const appOptions: CreateAppOptions = {
      fetchJwks,
      requireSellerOnboardedOptions: { db: db as any },
      listingsDraftCreateDeps: { db: db as any },
      listingsDraftUpdateDeps: { db: db as any },
      listingsDraftGetDeps: { db: db as any },
      listingsPublishDeps: { db: db as any },
      listingsListDeps: { db: db as any },
    };

    const app = createApp(appOptions);

    // Helper: mint a fresh JWT for each request (clerkAuth validates per-request)
    const auth = async () => `Bearer ${await buildTestJwt(jwksFixture, TEST_USER_ID)}`;

    // -------------------------------------------------------------------------
    // Step 1 — POST /api/listings/draft → 201, returns { id }
    // -------------------------------------------------------------------------

    const createRes = await app.request("/api/listings/draft", {
      method: "POST",
      headers: {
        Authorization: await auth(),
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(createRes.status).toBe(201);

    const createBody = (await createRes.json()) as { id: string };
    expect(typeof createBody.id).toBe("string");
    expect(createBody.id.length).toBeGreaterThan(0);

    const listingId = createBody.id;

    // Confirm row is in the store
    expect(store.listings).toHaveLength(1);
    expect(store.listings[0]?.status).toBe("draft");
    expect(store.listings[0]?.sellerUserId).toBe(TEST_USER_ID);

    // -------------------------------------------------------------------------
    // Step 2 — PATCH /api/listings/draft/:id → 200
    // -------------------------------------------------------------------------

    const patchRes = await app.request(`/api/listings/draft/${listingId}`, {
      method: "PATCH",
      headers: {
        Authorization: await auth(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        series: "X-Men",
        issue: "1",
        gradeCompany: "CGC",
        gradeNumeric: "9.8",
        priceCents: 5000,
      }),
    });

    expect(patchRes.status).toBe(200);

    const patchBody = (await patchRes.json()) as {
      series: string;
      issue: string;
      gradeCompany: string;
    };
    expect(patchBody.series).toBe("X-Men");
    expect(patchBody.issue).toBe("1");
    expect(patchBody.gradeCompany).toBe("CGC");

    // -------------------------------------------------------------------------
    // Step 3 — GET /api/listings/draft/:id → 200
    // -------------------------------------------------------------------------

    const getRes = await app.request(`/api/listings/draft/${listingId}`, {
      method: "GET",
      headers: { Authorization: await auth() },
    });

    expect(getRes.status).toBe(200);

    const getBody = (await getRes.json()) as {
      id: string;
      status: string;
      series: string;
      issue: string;
      gradeCompany: string;
      gradeNumeric: string;
      priceCents: number;
      images: unknown[];
    };
    expect(getBody.id).toBe(listingId);
    expect(getBody.status).toBe("draft");
    expect(getBody.series).toBe("X-Men");
    expect(getBody.issue).toBe("1");
    expect(getBody.gradeCompany).toBe("CGC");
    expect(getBody.priceCents).toBe(5000);
    expect(Array.isArray(getBody.images)).toBe(true);
    expect(getBody.images).toHaveLength(0);

    // -------------------------------------------------------------------------
    // Step 4 — Seed 2 images directly into the store
    // -------------------------------------------------------------------------

    const now = new Date();
    store.images.push(
      {
        id: "img-1",
        listingId,
        r2Key: "listings/img-1.jpg",
        position: 0,
        isPrimary: true,
        createdAt: now,
      },
      {
        id: "img-2",
        listingId,
        r2Key: "listings/img-2.jpg",
        position: 1,
        isPrimary: false,
        createdAt: now,
      },
    );

    // -------------------------------------------------------------------------
    // Step 5 — POST /api/listings/:id/publish → 200 with publishedAt set
    // -------------------------------------------------------------------------

    const publishRes = await app.request(`/api/listings/${listingId}/publish`, {
      method: "POST",
      headers: {
        Authorization: await auth(),
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(publishRes.status).toBe(200);

    const publishBody = (await publishRes.json()) as {
      id: string;
      status: string;
      publishedAt: string;
    };
    expect(publishBody.id).toBe(listingId);
    expect(publishBody.status).toBe("published");
    expect(typeof publishBody.publishedAt).toBe("string");
    expect(publishBody.publishedAt.length).toBeGreaterThan(0);

    // Confirm store row is updated
    expect(store.listings[0]?.status).toBe("published");

    // -------------------------------------------------------------------------
    // Step 6 — GET /api/listings → 200, includes published listing
    // -------------------------------------------------------------------------

    const listRes = await app.request("/api/listings", { method: "GET" });

    expect(listRes.status).toBe(200);

    const listBody = (await listRes.json()) as {
      listings: { id: string; status?: string }[];
      total: number;
    };
    expect(Array.isArray(listBody.listings)).toBe(true);
    expect(listBody.total).toBeGreaterThanOrEqual(1);

    const found = listBody.listings.find((l) => l.id === listingId);
    expect(found).toBeDefined();
  });

  it("AC-1: persists draft attributes across resume — second GET returns patched values", async () => {
    const jwksFixture = await buildJwks();
    const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);

    const store: Store = {
      listings: [],
      images: [],
      sellerAccounts: [
        { userId: TEST_USER_ID, onboardingStatus: "complete" },
      ],
    };

    const db = buildUnifiedDb(store);

    const appOptions: CreateAppOptions = {
      fetchJwks,
      requireSellerOnboardedOptions: { db: db as any },
      listingsDraftCreateDeps: { db: db as any },
      listingsDraftUpdateDeps: { db: db as any },
      listingsDraftGetDeps: { db: db as any },
      listingsPublishDeps: { db: db as any },
      listingsListDeps: { db: db as any },
    };

    const app = createApp(appOptions);
    const auth = async () => `Bearer ${await buildTestJwt(jwksFixture, TEST_USER_ID)}`;

    // Create draft
    const createRes = await app.request("/api/listings/draft", {
      method: "POST",
      headers: {
        Authorization: await auth(),
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(createRes.status).toBe(201);
    const { id } = (await createRes.json()) as { id: string };

    // Patch the draft
    const patchRes = await app.request(`/api/listings/draft/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: await auth(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        series: "Amazing Spider-Man",
        issue: "300",
        priceCents: 12000,
      }),
    });
    expect(patchRes.status).toBe(200);

    // "Resume" — second GET returns the patched values
    const resumeRes = await app.request(`/api/listings/draft/${id}`, {
      method: "GET",
      headers: { Authorization: await auth() },
    });
    expect(resumeRes.status).toBe(200);

    const resumeBody = (await resumeRes.json()) as {
      series: string;
      issue: string;
      priceCents: number;
      status: string;
    };
    expect(resumeBody.series).toBe("Amazing Spider-Man");
    expect(resumeBody.issue).toBe("300");
    expect(resumeBody.priceCents).toBe(12000);
    expect(resumeBody.status).toBe("draft");
  });

  it("AC-5: public listings index no auth required — returns published listings without Authorization header", async () => {
    const jwksFixture = await buildJwks();
    const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);

    const store: Store = {
      listings: [
        {
          id: "published-listing-ac5",
          sellerUserId: TEST_USER_ID,
          status: "published",
          series: "Batman",
          issue: "1",
          gradeCompany: "CGC",
          gradeNumeric: "9.6",
          priceCents: 9900,
          conditionNotes: null,
          catalogMatchId: null,
          publishedAt: new Date("2026-05-01T12:00:00Z"),
          createdAt: new Date("2026-04-30T10:00:00Z"),
          updatedAt: new Date("2026-05-01T12:00:00Z"),
        },
      ],
      images: [],
      sellerAccounts: [],
    };

    const db = buildUnifiedDb(store);

    const appOptions: CreateAppOptions = {
      fetchJwks,
      requireSellerOnboardedOptions: { db: db as any },
      listingsDraftCreateDeps: { db: db as any },
      listingsDraftUpdateDeps: { db: db as any },
      listingsDraftGetDeps: { db: db as any },
      listingsPublishDeps: { db: db as any },
      listingsListDeps: { db: db as any },
    };

    const app = createApp(appOptions);

    // No Authorization header — public endpoint
    const res = await app.request("/api/listings", { method: "GET" });

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      listings: { id: string }[];
      total: number;
    };
    expect(Array.isArray(body.listings)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);

    const found = body.listings.find((l) => l.id === "published-listing-ac5");
    expect(found).toBeDefined();
  });
});
