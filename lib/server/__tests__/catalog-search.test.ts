/**
 * Tests for lib/server/routes/catalog-search.ts
 *
 * AC-2: endpoint contract (200 cache-hit, 200 cache-miss, 400 invalid_query)
 * AC-4: degradation + timeout contract (200 degraded on adapter throw or timeout)
 *
 * The cache module (~/lib/server/catalog/cache) is mocked because its real
 * implementation ships in cycle-2. The logger is also mocked so we can assert
 * warn calls without polluting test output.
 */

import { Hono } from "hono";
import {
  createCatalogSearchHandler,
  type CatalogSearchDeps,
} from "../routes/catalog-search";
import type { AppVars } from "../types";
import type { CatalogMatch } from "~/lib/server/catalog/types";

// ---------------------------------------------------------------------------
// Mock cache module — cycle-2 stubs throw, so we MUST mock them.
// ---------------------------------------------------------------------------

const mockNormalizeQuery = jest.fn();
const mockComputeQueryKey = jest.fn();
const mockReadCache = jest.fn<Promise<CatalogMatch[] | null>, [unknown, string]>();
const mockWriteCache = jest.fn<Promise<void>, [unknown, string, CatalogMatch[], number]>();

jest.mock("~/lib/server/catalog/cache", () => ({
  normalizeQuery: (...args: unknown[]) => mockNormalizeQuery(...args),
  computeQueryKey: (...args: unknown[]) => mockComputeQueryKey(...args),
  readCache: (...args: unknown[]) => mockReadCache(...(args as [unknown, string])),
  writeCache: (...args: unknown[]) => mockWriteCache(...(args as [unknown, string, CatalogMatch[], number])),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MATCH_1: CatalogMatch = {
  catalogId: "cat-001",
  series: "Amazing Spider-Man",
  issueNumber: "129",
  publisher: "Marvel",
  publishedYear: 1974,
};

const MATCH_2: CatalogMatch = {
  catalogId: "cat-002",
  series: "Incredible Hulk",
  issueNumber: "181",
};

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function buildApp(deps: Partial<CatalogSearchDeps> & { adapter: CatalogSearchDeps["adapter"] }) {
  const fullDeps: CatalogSearchDeps = {
    db: {} as CatalogSearchDeps["db"],
    env: { CATALOG_CACHE_TTL_DAYS: 30 },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      withCorrelationId: jest.fn(),
      registerSink: jest.fn(),
      __resetForTests: jest.fn(),
    },
    ...deps,
  };

  const app = new Hono<{ Variables: AppVars }>();

  // Inject Clerk-like vars as if clerkAuth() ran.
  app.use("*", async (c, next) => {
    c.set("userId", "user_test_123");
    c.set("email", "test@example.com");
    await next();
  });

  app.get("/api/catalog/search", createCatalogSearchHandler(fullDeps));

  return { app, deps: fullDeps };
}

function makeAdapter(impl: () => Promise<CatalogMatch[]>): CatalogSearchDeps["adapter"] {
  return { search: jest.fn().mockImplementation(impl) };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Default: normalizeQuery returns input unchanged; computeQueryKey returns fixed key.
  mockNormalizeQuery.mockImplementation((q: unknown) => q);
  mockComputeQueryKey.mockReturnValue("test-cache-key");
  mockReadCache.mockResolvedValue(null);
  mockWriteCache.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// AC-2 tests
// ---------------------------------------------------------------------------

describe("AC-2: returns 200 with cache hit when readCache returns matches", () => {
  it("returns matches with cacheHit:true and degraded:false", async () => {
    mockReadCache.mockResolvedValue([MATCH_1]);

    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?q=spider-man");
    expect(res.status).toBe(200);

    const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
    expect(body.matches).toEqual([MATCH_1]);
    expect(body.cacheHit).toBe(true);
    expect(body.degraded).toBe(false);

    // Adapter must NOT be called on a cache hit.
    expect(adapter.search).not.toHaveBeenCalled();
  });
});

describe("AC-2: returns 200 with cache miss + adapter success", () => {
  it("calls adapter, writes cache, returns cacheHit:false degraded:false", async () => {
    mockReadCache.mockResolvedValue(null);

    const adapter = makeAdapter(() => Promise.resolve([MATCH_1, MATCH_2]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?q=spider-man");
    expect(res.status).toBe(200);

    const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
    expect(body.matches).toEqual([MATCH_1, MATCH_2]);
    expect(body.cacheHit).toBe(false);
    expect(body.degraded).toBe(false);

    // writeCache must be called with the adapter results.
    expect(mockWriteCache).toHaveBeenCalledWith({}, "test-cache-key", [MATCH_1, MATCH_2], 30);
  });
});

describe("AC-2: returns 400 invalid_query when both q and structured form are empty", () => {
  it("returns 400 { error: 'invalid_query' } with no query params", async () => {
    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search");
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_query" });
  });

  it("returns 400 when series is provided but issueNumber is missing", async () => {
    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?series=Amazing+Spider-Man");
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_query" });
  });

  it("returns 400 when issueNumber is provided but series is missing", async () => {
    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?issueNumber=129");
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_query" });
  });
});

describe("AC-2: returns 400 invalid_query when only whitespace", () => {
  it("returns 400 for q with only spaces", async () => {
    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?q=   ");
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_query" });
  });

  it("returns 400 for series+issueNumber with only whitespace", async () => {
    const adapter = makeAdapter(() => Promise.resolve([]));
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?series=   &issueNumber=   ");
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body).toEqual({ error: "invalid_query" });
  });
});

describe("AC-2: structured query (series + issueNumber) returns 200", () => {
  it("returns matches when series and issueNumber are both provided", async () => {
    mockReadCache.mockResolvedValue(null);
    const adapter = makeAdapter(() => Promise.resolve([MATCH_1]));
    const { app } = buildApp({ adapter });

    const res = await app.request(
      "/api/catalog/search?series=Amazing+Spider-Man&issueNumber=129",
    );
    expect(res.status).toBe(200);

    const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
    expect(body.matches).toEqual([MATCH_1]);
    expect(body.cacheHit).toBe(false);
    expect(body.degraded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-4 tests
// ---------------------------------------------------------------------------

describe("AC-4: returns 200 degraded with empty matches when adapter throws", () => {
  it("returns { matches: [], cacheHit: false, degraded: true } on adapter throw", async () => {
    mockReadCache.mockResolvedValue(null);
    const adapter: CatalogSearchDeps["adapter"] = {
      search: jest.fn().mockRejectedValue(new Error("upstream failure")),
    };
    const { app } = buildApp({ adapter });

    const res = await app.request("/api/catalog/search?q=batman");
    expect(res.status).toBe(200);

    const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
    expect(body.matches).toEqual([]);
    expect(body.cacheHit).toBe(false);
    expect(body.degraded).toBe(true);
  });
});

describe("AC-4: returns 200 degraded with empty matches when adapter exceeds 1400ms timeout", () => {
  it("returns degraded:true before the slow adapter resolves", async () => {
    jest.useFakeTimers();

    mockReadCache.mockResolvedValue(null);

    // Slow adapter — never resolves within test time.
    const adapter: CatalogSearchDeps["adapter"] = {
      search: jest.fn().mockImplementation(
        () => new Promise<CatalogMatch[]>((resolve) => setTimeout(() => resolve([MATCH_1]), 5000)),
      ),
    };

    const { app } = buildApp({ adapter });
    const resPromise = app.request("/api/catalog/search?q=slow");

    // Advance past the 1400ms timeout and flush promises.
    await jest.advanceTimersByTimeAsync(1500);

    const res = await resPromise;
    expect(res.status).toBe(200);

    const body = await res.json() as { matches: CatalogMatch[]; cacheHit: boolean; degraded: boolean };
    expect(body.matches).toEqual([]);
    expect(body.cacheHit).toBe(false);
    expect(body.degraded).toBe(true);

    jest.clearAllTimers();
    jest.useRealTimers();
  });
});

describe("AC-4: logs warn with serialized error on adapter failure", () => {
  it("logs warn when adapter throws", async () => {
    mockReadCache.mockResolvedValue(null);

    const adapterError = new Error("network timeout");
    const adapter: CatalogSearchDeps["adapter"] = {
      search: jest.fn().mockRejectedValue(adapterError),
    };
    const { app, deps } = buildApp({ adapter });

    await app.request("/api/catalog/search?q=test");

    expect(deps.logger!.warn).toHaveBeenCalledWith(
      "catalog-search: adapter failed",
      expect.objectContaining({
        err: expect.objectContaining({
          name: "Error",
          message: "network timeout",
        }),
        query: expect.anything(),
      }),
    );
  });

  it("logs warn when adapter times out", async () => {
    jest.useFakeTimers();

    mockReadCache.mockResolvedValue(null);

    const adapter: CatalogSearchDeps["adapter"] = {
      search: jest.fn().mockImplementation(
        () => new Promise<CatalogMatch[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ),
    };

    const { app, deps } = buildApp({ adapter });
    const resPromise = app.request("/api/catalog/search?q=slow-warn");

    // Advance past the 1400ms timeout and flush promises.
    await jest.advanceTimersByTimeAsync(1500);
    await resPromise;

    expect(deps.logger!.warn).toHaveBeenCalledWith(
      "catalog-search: adapter failed",
      expect.objectContaining({
        err: expect.objectContaining({ message: expect.stringContaining("1400ms") }),
        query: expect.anything(),
      }),
    );

    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
