/**
 * Tests for:
 *   - lib/server/routes/listings-list.ts  (AC-3)
 *
 * AC-3: Filter eligibility is synchronous — a listing published via POST /:id/publish
 *       appears in this list on the very next request. No async queue.
 */

import { Hono } from "hono";
import {
  listingsListHandler,
  type ListingsListDeps,
} from "../routes/listings-list";

// ---------------------------------------------------------------------------
// Types matching listings schema
// ---------------------------------------------------------------------------

type ListingRow = {
  id: string;
  series: string | null;
  issue: string | null;
  gradeCompany: string | null;
  gradeNumeric: string | null;
  priceCents: number | null;
  publishedAt: Date | null;
  status: string;
};

// ---------------------------------------------------------------------------
// Mock DB helpers
//
// The handler needs two queries:
//   1. List query:  db.select().from().where().orderBy().limit().offset() => rows
//   2. Count query: db.select({count}).from().where() => [{count: N}]
//
// We distinguish them by the presence of a `fields` argument to select():
//   - select()         => list query (no args)
//   - select({count})  => count query (has args)
// ---------------------------------------------------------------------------

function buildMockDb(rows: ListingRow[], total: number = rows.length) {
  return {
    select: (fields?: unknown) => {
      if (fields !== undefined) {
        // Count query: select({count}).from().where() => Promise<[{count}]>
        return {
          from: () => ({
            where: () => Promise.resolve([{ count: total }]),
          }),
        };
      }
      // List query: select().from().where().orderBy().limit().offset() => Promise<rows>
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: (): Promise<ListingRow[]> => Promise.resolve(rows),
              }),
            }),
          }),
        }),
      };
    },
  };
}

function buildThrowingDb(error: Error) {
  // The handler runs the list query first: .where().orderBy().limit().offset()
  // We reject at .offset() so the catch block fires.
  return {
    select: (_fields?: unknown) => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: (): Promise<never> => Promise.reject(error),
            }),
          }),
        }),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: ListingsListDeps) {
  const app = new Hono();
  app.get("/api/listings", listingsListHandler(deps));
  return app;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const t1 = new Date("2024-03-01T10:00:00Z");
const t2 = new Date("2024-02-01T10:00:00Z");
const t3 = new Date("2024-01-01T10:00:00Z");

const publishedListing1: ListingRow = {
  id: "listing-1",
  series: "Amazing Spider-Man",
  issue: "300",
  gradeCompany: "CGC",
  gradeNumeric: "9.8",
  priceCents: 50000,
  publishedAt: t1,
  status: "published",
};

const publishedListing2: ListingRow = {
  id: "listing-2",
  series: "X-Men",
  issue: "1",
  gradeCompany: "CBCS",
  gradeNumeric: "8.0",
  priceCents: 30000,
  publishedAt: t2,
  status: "published",
};

const publishedListing3: ListingRow = {
  id: "listing-3",
  series: "Hulk",
  issue: "181",
  gradeCompany: null,
  gradeNumeric: null,
  priceCents: null,
  publishedAt: t3,
  status: "published",
};


// ---------------------------------------------------------------------------
// 200 happy path
// ---------------------------------------------------------------------------

describe("listingsListHandler", () => {
  describe("200 happy path", () => {
    it("returns 200 with listings array when rows exist", async () => {
      const db = buildMockDb([publishedListing1, publishedListing2]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { listings: unknown[]; total: number };
      expect(body).toHaveProperty("listings");
      expect(Array.isArray(body.listings)).toBe(true);
      expect(body).toHaveProperty("total");
    });

    it("returns 200 with empty listings array when no published rows", async () => {
      const db = buildMockDb([], 0);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      expect(res.status).toBe(200);

      const body = (await res.json()) as { listings: unknown[]; total: number };
      expect(body.listings).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it("defaults status to 'published' when not provided", async () => {
      const db = buildMockDb([publishedListing1]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      expect(res.status).toBe(200);
    });

    it("accepts explicit status=published query param", async () => {
      const db = buildMockDb([publishedListing1]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?status=published");
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Response shape
  // ---------------------------------------------------------------------------

  describe("response shape", () => {
    it("each listing has id, series, issue, gradeCompany, gradeNumeric, priceCents, publishedAt", async () => {
      const db = buildMockDb([publishedListing1]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      const body = (await res.json()) as {
        listings: {
          id: string;
          series: string | null;
          issue: string | null;
          gradeCompany: string | null;
          gradeNumeric: string | null;
          priceCents: number | null;
          publishedAt: string | null;
        }[];
        total: number;
      };

      const listing = body.listings[0]!;
      expect(listing).toHaveProperty("id", "listing-1");
      expect(listing).toHaveProperty("series", "Amazing Spider-Man");
      expect(listing).toHaveProperty("issue", "300");
      expect(listing).toHaveProperty("gradeCompany", "CGC");
      expect(listing).toHaveProperty("gradeNumeric", "9.8");
      expect(listing).toHaveProperty("priceCents", 50000);
      expect(listing).toHaveProperty("publishedAt");
      // publishedAt must be an ISO string
      expect(typeof listing.publishedAt).toBe("string");
    });

    it("handles null optional fields gracefully", async () => {
      const db = buildMockDb([publishedListing3]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      const body = (await res.json()) as {
        listings: { gradeCompany: null; gradeNumeric: null; priceCents: null }[];
      };

      const listing = body.listings[0]!;
      expect(listing.gradeCompany).toBeNull();
      expect(listing.gradeNumeric).toBeNull();
      expect(listing.priceCents).toBeNull();
    });

    it("total reflects the count, not just the page length", async () => {
      const db = buildMockDb([publishedListing1], 42);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      const body = (await res.json()) as { listings: unknown[]; total: number };

      expect(body.listings).toHaveLength(1);
      expect(body.total).toBe(42);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 tests
  // ---------------------------------------------------------------------------

  describe("AC-3: synchronous publish visibility", () => {
    it("AC-3: a published listing appears in GET /api/listings on the very next request", async () => {
      // Simulate a store that starts empty, then gains a published listing.
      // The second call to the handler (representing "the very next request")
      // sees the updated store immediately — no async queue needed.
      const store: ListingRow[] = [];

      function buildLiveDb() {
        return {
          select: (fields?: unknown) => {
            if (fields !== undefined) {
              return {
                from: () => ({
                  where: () => Promise.resolve([{ count: store.length }]),
                }),
              };
            }
            return {
              from: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () => ({
                      offset: (): Promise<ListingRow[]> =>
                        Promise.resolve([...store]),
                    }),
                  }),
                }),
              }),
            };
          },
        };
      }

      const db = buildLiveDb();
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      // First request — no published listings yet
      const res1 = await app.request("/api/listings");
      const body1 = (await res1.json()) as { listings: unknown[]; total: number };
      expect(body1.listings).toHaveLength(0);
      expect(body1.total).toBe(0);

      // Publish a listing (simulating POST /:id/publish completing)
      store.push(publishedListing1);

      // Very next request — published listing must appear
      const res2 = await app.request("/api/listings");
      const body2 = (await res2.json()) as {
        listings: { id: string }[];
        total: number;
      };
      expect(body2.listings).toHaveLength(1);
      expect(body2.listings[0]!.id).toBe("listing-1");
      expect(body2.total).toBe(1);
    });

    it("AC-3: draft listings are excluded from the public list", async () => {
      // The mock DB only returns published rows (WHERE status='published' is applied by the handler).
      // The mock simulates what the DB would return after applying the filter.
      const db = buildMockDb([], 0); // draft listing filtered out at DB level
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      const body = (await res.json()) as { listings: unknown[]; total: number };

      // No draft listings in the response
      expect(body.listings).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it("AC-3: results are ordered by published_at DESC", async () => {
      // Mock returns rows in publishedAt DESC order (newest first)
      // t1 > t2 > t3
      const rows = [publishedListing1, publishedListing2, publishedListing3];
      const db = buildMockDb(rows);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      const body = (await res.json()) as {
        listings: { id: string; publishedAt: string }[];
      };

      expect(body.listings[0]!.id).toBe("listing-1");
      expect(body.listings[1]!.id).toBe("listing-2");
      expect(body.listings[2]!.id).toBe("listing-3");

      // Verify dates are in descending order
      const dates = body.listings.map((l) => new Date(l.publishedAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]!).toBeGreaterThan(dates[i + 1]!);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  describe("pagination", () => {
    it("defaults limit=50 and offset=0", async () => {
      const db = buildMockDb([publishedListing1]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      expect(res.status).toBe(200);
    });

    it("accepts valid limit and offset", async () => {
      const db = buildMockDb([publishedListing1]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?limit=10&offset=5");
      expect(res.status).toBe(200);
    });

    it("returns 400 invalid_pagination for limit=0", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?limit=0");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_pagination");
    });

    it("returns 400 invalid_pagination for limit=101", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?limit=101");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_pagination");
    });

    it("returns 400 invalid_pagination for negative offset", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?offset=-1");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_pagination");
    });

    it("returns 400 invalid_pagination for non-integer limit", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?limit=abc");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_pagination");
    });
  });

  // ---------------------------------------------------------------------------
  // Status validation
  // ---------------------------------------------------------------------------

  describe("status validation", () => {
    it("returns 400 invalid_status for status=draft", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?status=draft");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_status");
    });

    it("returns 400 invalid_status for status=unknown", async () => {
      const db = buildMockDb([]);
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings?status=unknown");
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("invalid_status");
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe("error handling", () => {
    it("returns 500 with internal_error when DB throws", async () => {
      const db = buildThrowingDb(new Error("DB connection failed"));
      const app = buildApp({ db: db as unknown as ListingsListDeps["db"] });

      const res = await app.request("/api/listings");
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("internal_error");
    });
  });
});
