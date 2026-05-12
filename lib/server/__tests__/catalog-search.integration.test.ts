/**
 * Integration tests for GET /api/catalog/search wired through createApp.
 *
 * Exercises the cache-miss → adapter dispatch → cache-write → cache-hit walk
 * end-to-end through the real createApp() factory and real readCache/writeCache
 * functions, with injected stubs for the drizzle-shaped CacheDb and the
 * CatalogAdapter.
 *
 * AC-5: wiring + end-to-end walk through createApp
 */

import type { JSONWebKeySet } from "jose";
import type { SQL } from "drizzle-orm";

import { createApp } from "../app";
import { buildJwks, type JwksFixture } from "./_jwks-helpers";
import { __resetJwksCacheForTests } from "../middleware/clerk-auth";
import { catalogSearchCache } from "~/lib/db/schema";
import type { CacheDb } from "~/lib/server/catalog/cache";
import type { CatalogAdapter } from "~/lib/server/catalog/adapter";
import type { CatalogMatch } from "~/lib/server/catalog/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildTestJwt(
  fixture: JwksFixture,
  userId = "user_catalog_int_1",
): Promise<string> {
  return fixture.signJwt({ sub: userId, email: `${userId}@test.example.com` });
}

// ---------------------------------------------------------------------------
// In-memory CacheDb stub
//
// Satisfies the drizzle-shaped CacheDb type exported from
// lib/server/catalog/cache.ts.  The stub inspects the drizzle SQL condition
// (same queryChunks AST walk used by stripe-connect.integration.test.ts) to
// extract the queryKey value and filters the in-memory Map by both queryKey
// and expiresAt.
//
// The condition passed to .where() is:
//   and(eq(catalogSearchCache.queryKey, key), gt(catalogSearchCache.expiresAt, now))
//
// AST path to the queryKey value (confirmed via bun introspection):
//   cond.queryChunks[1].queryChunks[0].queryChunks[3].value
// ---------------------------------------------------------------------------

type CacheRow = {
  queryKey: string;
  payload: CatalogMatch[];
  expiresAt: Date;
};

type SqlChunk = { name?: string; value?: unknown; queryChunks?: SqlChunk[] };

function extractQueryKeyFromCondition(condition: unknown): string | undefined {
  const cond = condition as SqlChunk;
  // and() wraps its two operands inside cond.queryChunks[1]
  const andInner = cond?.queryChunks?.[1];
  // eq() is the first operand inside andInner.queryChunks[0]
  const eqChunk = andInner?.queryChunks?.[0];
  // queryChunks[3].value is the bound param value
  const val = eqChunk?.queryChunks?.[3]?.value;
  return typeof val === "string" ? val : undefined;
}

function buildInMemoryCacheDb(): { db: CacheDb; store: Map<string, CacheRow> } {
  const store = new Map<string, CacheRow>();

  const db: CacheDb = {
    select: () => ({
      from: (_table: typeof catalogSearchCache) => ({
        where: (condition: SQL | undefined): Promise<CacheRow[]> => {
          const key = extractQueryKeyFromCondition(condition);
          if (!key) return Promise.resolve([]);
          const row = store.get(key);
          if (!row) return Promise.resolve([]);
          if (row.expiresAt <= new Date()) return Promise.resolve([]);
          return Promise.resolve([row]);
        },
      }),
    }),
    insert: (_table: typeof catalogSearchCache) => ({
      values: (data: { queryKey: string; payload: CatalogMatch[]; expiresAt: Date }) => ({
        onConflictDoUpdate: (_opts: {
          target: (typeof catalogSearchCache)["queryKey"];
          set: { payload: CatalogMatch[]; expiresAt: Date };
        }): Promise<void> => {
          store.set(data.queryKey, {
            queryKey: data.queryKey,
            payload: _opts.set.payload,
            expiresAt: _opts.set.expiresAt,
          });
          return Promise.resolve();
        },
      }),
    }),
  };

  return { db, store };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MATCH_SPIDER: CatalogMatch = {
  catalogId: "gcd-asm-129",
  series: "Amazing Spider-Man",
  issueNumber: "129",
  publisher: "Marvel",
  publishedYear: 1974,
};

// ---------------------------------------------------------------------------
// Reset JWKS cache between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetJwksCacheForTests();
});

// ---------------------------------------------------------------------------
// AC-5 — cache-miss → adapter → cache-hit walk through createApp
// ---------------------------------------------------------------------------

it("AC-5: cache-miss → adapter dispatched → response has cacheHit:false", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);
  const { db } = buildInMemoryCacheDb();

  const adapter: CatalogAdapter = {
    search: jest.fn().mockResolvedValue([MATCH_SPIDER]),
  };

  const app = createApp({
    fetchJwks,
    catalogSearchDeps: {
      db,
      adapter,
      env: { CATALOG_CACHE_TTL_DAYS: 30 },
    },
  });

  const jwt = await buildTestJwt(jwksFixture);
  const res = await app.request("/api/catalog/search?q=Amazing+Spider-Man", {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  expect(res.status).toBe(200);
  const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
  expect(body.cacheHit).toBe(false);
  expect(body.degraded).toBe(false);
  expect(body.matches).toEqual([MATCH_SPIDER]);
  expect(adapter.search).toHaveBeenCalledTimes(1);
});

it("AC-5: second request with same query returns cacheHit:true — adapter NOT called again", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);
  const { db } = buildInMemoryCacheDb();

  const adapter: CatalogAdapter = {
    search: jest.fn().mockResolvedValue([MATCH_SPIDER]),
  };

  const app = createApp({
    fetchJwks,
    catalogSearchDeps: {
      db,
      adapter,
      env: { CATALOG_CACHE_TTL_DAYS: 30 },
    },
  });

  const jwt1 = await buildTestJwt(jwksFixture, "user_cache_walk_1");
  const jwt2 = await buildTestJwt(jwksFixture, "user_cache_walk_2");

  // First request — cache miss.
  const res1 = await app.request("/api/catalog/search?q=Amazing+Spider-Man", {
    headers: { Authorization: `Bearer ${jwt1}` },
  });
  expect(res1.status).toBe(200);
  const body1 = await res1.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
  expect(body1.cacheHit).toBe(false);

  // writeCache is async/void — flush microtasks before second request.
  await new Promise((r) => setTimeout(r, 0));

  // Second request — should be a cache hit.
  const res2 = await app.request("/api/catalog/search?q=Amazing+Spider-Man", {
    headers: { Authorization: `Bearer ${jwt2}` },
  });
  expect(res2.status).toBe(200);
  const body2 = await res2.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
  expect(body2.cacheHit).toBe(true);
  expect(body2.degraded).toBe(false);
  expect(body2.matches).toEqual([MATCH_SPIDER]);

  // Adapter must have been called exactly once (miss), not on the cache hit.
  expect(adapter.search).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// AC-5 — 400 invalid_query via wired route
// ---------------------------------------------------------------------------

it("AC-5: empty query param returns 400 invalid_query through wired route", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);
  const { db } = buildInMemoryCacheDb();

  const adapter: CatalogAdapter = {
    search: jest.fn().mockResolvedValue([]),
  };

  const app = createApp({
    fetchJwks,
    catalogSearchDeps: {
      db,
      adapter,
      env: { CATALOG_CACHE_TTL_DAYS: 30 },
    },
  });

  const jwt = await buildTestJwt(jwksFixture);
  const res = await app.request("/api/catalog/search", {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  expect(res.status).toBe(400);
  const body = await res.json() as { error: string };
  expect(body).toEqual({ error: "invalid_query" });
});

// ---------------------------------------------------------------------------
// AC-5 — 401 when Clerk auth is absent
// ---------------------------------------------------------------------------

it("AC-5: missing Authorization header returns 401 via Clerk middleware", async () => {
  const jwksFixture = await buildJwks();
  const fetchJwks = jest.fn(async (): Promise<JSONWebKeySet> => jwksFixture.jwks);
  const { db } = buildInMemoryCacheDb();

  const adapter: CatalogAdapter = {
    search: jest.fn().mockResolvedValue([]),
  };

  const app = createApp({
    fetchJwks,
    catalogSearchDeps: {
      db,
      adapter,
      env: { CATALOG_CACHE_TTL_DAYS: 30 },
    },
  });

  const res = await app.request("/api/catalog/search?q=spider-man");
  expect(res.status).toBe(401);
});
