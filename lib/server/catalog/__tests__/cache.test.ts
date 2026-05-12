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
 * - readCache: expired entries excluded (where condition shape)
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
import type { CatalogMatch } from "../types";

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

  it("passes a non-undefined where condition (expired entries excluded by clause)", async () => {
    let capturedCondition: unknown;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: (condition: unknown) => {
            capturedCondition = condition;
            return Promise.resolve([]);
          },
        }),
      }),
      insert: jest.fn(),
    };

    await readCache(mockDb as never, "any-key");
    expect(capturedCondition).not.toBeUndefined();
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
