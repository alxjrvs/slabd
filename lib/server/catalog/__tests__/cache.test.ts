/**
 * Tests for lib/server/catalog/cache.ts — AC-3
 *
 * Covers:
 * - normalizeQuery: whitespace collapse, lowercasing, trim
 * - normalizeQuery: undefined fields remain undefined
 * - normalizeQuery: leading-zero strip on issueNumber
 * - computeQueryKey: same hash for equivalent queries (case/whitespace)
 * - computeQueryKey: different hashes for different queries
 * - computeQueryKey: key ordering and undefined fields don't affect hash
 * - readCache: returns payload on hit
 * - readCache: returns null on miss
 * - readCache: WHERE uses gt(expiresAt, new Date()) — catches a gt→gte flip
 * - readCache: behavioral — future-expiry row hits, past-expiry row is filtered
 * - writeCache: insert with correct expires_at offset
 * - writeCache: swallows error + logs warn on failure
 */

import {
  normalizeQuery,
  computeQueryKey,
  readCache,
  writeCache,
} from "../cache";
import { logger } from "~/lib/logger";
import { catalogSearchCache } from "~/lib/db/schema";
import type { CatalogMatch } from "../types";

// Mock drizzle-orm operators so the WHERE condition is inspectable and
// replayable in tests. jest.mock is hoisted above all imports at compile
// time. Other drizzle entrypoints (drizzle-orm/pg-core, drizzle-orm/neon-http)
// are untouched, so schema and client load normally.
jest.mock("drizzle-orm", () => ({
  __esModule: true,
  eq: (col: unknown, val: unknown) => ({ __op: "eq" as const, col, val }),
  gt: (col: unknown, val: unknown) => ({ __op: "gt" as const, col, val }),
  and: (...args: unknown[]) => ({ __op: "and" as const, args }),
}));

// ---------------------------------------------------------------------------
// Captured-condition descriptor types (output of the drizzle-orm mock above)
// ---------------------------------------------------------------------------

type EqCond = { __op: "eq"; col: unknown; val: unknown };
type GtCond = { __op: "gt"; col: unknown; val: unknown };
type AndCond = { __op: "and"; args: Condition[] };
type Condition = EqCond | GtCond | AndCond;

function applyCondition(cond: Condition, row: Record<string, unknown>): boolean {
  if (cond.__op === "and") return cond.args.every((sub) => applyCondition(sub, row));
  if (cond.__op === "eq") return getColumnValue(cond.col, row) === cond.val;
  if (cond.__op === "gt") {
    const left = getColumnValue(cond.col, row);
    const right = cond.val;
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() > right.getTime();
    }
    return (left as number) > (right as number);
  }
  return false;
}

function getColumnValue(col: unknown, row: Record<string, unknown>): unknown {
  if (col === catalogSearchCache.queryKey) return row.queryKey;
  if (col === catalogSearchCache.expiresAt) return row.expiresAt;
  if (col === catalogSearchCache.payload) return row.payload;
  if (col === catalogSearchCache.createdAt) return row.createdAt;
  throw new Error("applyCondition: unknown column reference");
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const sampleMatch: CatalogMatch = {
  catalogId: "marvel-asm-129",
  series: "Amazing Spider-Man",
  issueNumber: "129",
  publisher: "Marvel",
  publishedYear: 1974,
};

// ---------------------------------------------------------------------------
// normalizeQuery
// ---------------------------------------------------------------------------

describe("normalizeQuery", () => {
  it("lowercases, trims, and collapses internal whitespace on q", () => {
    const result = normalizeQuery({ q: "  Amazing Spider-Man  #129  " });
    expect(result.q).toBe("amazing spider-man #129");
  });

  it("collapses multiple spaces and tabs in series", () => {
    const result = normalizeQuery({ series: "Amazing  Spider-Man\t #129" });
    expect(result.series).toBe("amazing spider-man #129");
  });

  it("lowercases series", () => {
    const result = normalizeQuery({ series: "BATMAN" });
    expect(result.series).toBe("batman");
  });

  it("trims leading and trailing whitespace from series", () => {
    const result = normalizeQuery({ series: "  X-Men  " });
    expect(result.series).toBe("x-men");
  });

  it("leaves undefined fields undefined — does not coerce to empty string", () => {
    const result = normalizeQuery({ q: "spider-man" });
    expect(result.series).toBeUndefined();
    expect(result.issueNumber).toBeUndefined();
  });

  it("leaves all undefined when query is empty", () => {
    const result = normalizeQuery({});
    expect(result.q).toBeUndefined();
    expect(result.series).toBeUndefined();
    expect(result.issueNumber).toBeUndefined();
  });

  it("strips leading zeros from issueNumber (007 → 7)", () => {
    const result = normalizeQuery({ issueNumber: "007" });
    expect(result.issueNumber).toBe("7");
  });

  it("preserves single zero", () => {
    const result = normalizeQuery({ issueNumber: "0" });
    expect(result.issueNumber).toBe("0");
  });

  it("does not strip non-leading zeros", () => {
    const result = normalizeQuery({ issueNumber: "129" });
    expect(result.issueNumber).toBe("129");
  });

  it("trims and lowercases issueNumber before stripping zeros", () => {
    const result = normalizeQuery({ issueNumber: "  007  " });
    expect(result.issueNumber).toBe("7");
  });
});

// ---------------------------------------------------------------------------
// computeQueryKey
// ---------------------------------------------------------------------------

describe("computeQueryKey", () => {
  it("returns the same hash for queries that differ only in case and whitespace", () => {
    const key1 = computeQueryKey({ q: "Amazing Spider-Man  #129  " });
    const key2 = computeQueryKey({ q: "amazing spider-man #129" });
    expect(key1).toBe(key2);
  });

  it("returns different hashes for genuinely different queries", () => {
    const key1 = computeQueryKey({ q: "Amazing Spider-Man #129" });
    const key2 = computeQueryKey({ q: "Batman #251" });
    expect(key1).not.toBe(key2);
  });

  it("returns the same hash regardless of property enumeration order", () => {
    const key1 = computeQueryKey({ series: "Amazing Spider-Man", issueNumber: "129" });
    const key2 = computeQueryKey({ issueNumber: "129", series: "Amazing Spider-Man" });
    expect(key1).toBe(key2);
  });

  it("undefined fields do not affect the hash", () => {
    const key1 = computeQueryKey({ series: "batman" });
    const key2 = computeQueryKey({ series: "batman", q: undefined, issueNumber: undefined });
    expect(key1).toBe(key2);
  });

  it("returns a 64-character hex string (SHA-256)", () => {
    const key = computeQueryKey({ q: "test" });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// readCache
// ---------------------------------------------------------------------------

describe("readCache", () => {
  it("returns payload array on cache hit", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              { queryKey: "test-key", payload: [sampleMatch], expiresAt: futureDate },
            ]),
        }),
      }),
      insert: jest.fn(),
    };

    const result = await readCache(mockDb as never, "test-key");
    expect(result).toEqual([sampleMatch]);
  });

  it("returns null on cache miss (empty rows)", async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
      insert: jest.fn(),
    };

    const result = await readCache(mockDb as never, "missing-key");
    expect(result).toBeNull();
  });

  it("issues WHERE = and(eq(queryKey, key), gt(expiresAt, new Date())) — catches a gt→gte flip", async () => {
    let capturedCondition: Condition | undefined;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: (cond: Condition) => {
            capturedCondition = cond;
            return Promise.resolve([]);
          },
        }),
      }),
      insert: jest.fn(),
    };

    const before = Date.now();
    await readCache(mockDb as never, "some-key");
    const after = Date.now();

    expect(capturedCondition).toBeDefined();
    expect(capturedCondition!.__op).toBe("and");
    const and = capturedCondition as AndCond;
    expect(and.args).toHaveLength(2);

    const first = and.args[0]!;
    const second = and.args[1]!;
    expect(first.__op).toBe("eq");
    const eq = first as EqCond;
    expect(eq.col).toBe(catalogSearchCache.queryKey);
    expect(eq.val).toBe("some-key");

    expect(second.__op).toBe("gt");
    const gt = second as GtCond;
    expect(gt.col).toBe(catalogSearchCache.expiresAt);
    expect(gt.val).toBeInstanceOf(Date);
    const valTime = (gt.val as Date).getTime();
    expect(valTime).toBeGreaterThanOrEqual(before);
    expect(valTime).toBeLessThanOrEqual(after);
  });

  it("behavioral: future-expiry row passes the WHERE filter → cache hit", async () => {
    const futureRow = {
      queryKey: "boundary-key",
      payload: [sampleMatch],
      expiresAt: new Date(Date.now() + 60_000),
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: (cond: Condition) =>
            Promise.resolve([futureRow].filter((r) => applyCondition(cond, r))),
        }),
      }),
      insert: jest.fn(),
    };

    const result = await readCache(mockDb as never, "boundary-key");
    expect(result).toEqual([sampleMatch]);
  });

  it("behavioral: past-expiry row is excluded by the WHERE filter → cache miss", async () => {
    const pastRow = {
      queryKey: "boundary-key",
      payload: [sampleMatch],
      expiresAt: new Date(Date.now() - 60_000),
    };

    const mockDb = {
      select: () => ({
        from: () => ({
          where: (cond: Condition) =>
            Promise.resolve([pastRow].filter((r) => applyCondition(cond, r))),
        }),
      }),
      insert: jest.fn(),
    };

    const result = await readCache(mockDb as never, "boundary-key");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// writeCache
// ---------------------------------------------------------------------------

describe("writeCache", () => {
  it("calls insert.values with queryKey, payload, and expires_at offset by ttlDays", async () => {
    const ttlDays = 7;
    let capturedValues: { expiresAt: Date; queryKey: string; payload: CatalogMatch[] } | null =
      null;

    const mockDb = {
      select: jest.fn(),
      insert: () => ({
        values: (vals: { expiresAt: Date; queryKey: string; payload: CatalogMatch[] }) => {
          capturedValues = vals;
          return { onConflictDoUpdate: () => Promise.resolve() };
        },
      }),
    };

    const before = Date.now();
    await writeCache(mockDb as never, "write-key", [sampleMatch], ttlDays);
    const after = Date.now();

    expect(capturedValues).not.toBeNull();
    expect(capturedValues!.queryKey).toBe("write-key");
    expect(capturedValues!.payload).toEqual([sampleMatch]);

    const expectedMin = before + ttlDays * 24 * 60 * 60 * 1000;
    const expectedMax = after + ttlDays * 24 * 60 * 60 * 1000;
    expect(capturedValues!.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(capturedValues!.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("calls onConflictDoUpdate with payload + expiresAt for upsert", async () => {
    let capturedSet: { payload: CatalogMatch[]; expiresAt: Date } | null = null;

    const mockDb = {
      select: jest.fn(),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: (opts: {
            target: unknown;
            set: { payload: CatalogMatch[]; expiresAt: Date };
          }) => {
            capturedSet = opts.set;
            return Promise.resolve();
          },
        }),
      }),
    };

    await writeCache(mockDb as never, "conflict-key", [sampleMatch], 30);

    expect(capturedSet).not.toBeNull();
    expect(capturedSet!.payload).toEqual([sampleMatch]);
    expect(capturedSet!.expiresAt).toBeInstanceOf(Date);
  });

  it("swallows insert error and calls logger.warn with serialized error and queryKey", async () => {
    const warnCalls: { message: string; data: Record<string, unknown> }[] = [];
    const unregister = logger.registerSink((record) => {
      if (record.level === "warn") {
        warnCalls.push({ message: record.message, data: record.data ?? {} });
      }
    });

    const thrownError = new Error("DB connection lost");
    const mockDb = {
      select: jest.fn(),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => Promise.reject(thrownError),
        }),
      }),
    };

    await expect(
      writeCache(mockDb as never, "fail-key", [sampleMatch], 30),
    ).resolves.toBeUndefined();

    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0]!.message).toBe("catalog-search: cache write failed");
    expect(warnCalls[0]!.data.queryKey).toBe("fail-key");
    expect(warnCalls[0]!.data.err).toMatchObject({
      name: "Error",
      message: "DB connection lost",
    });

    unregister();
  });
});
