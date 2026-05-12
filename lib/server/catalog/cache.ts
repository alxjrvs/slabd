import { createHash } from "node:crypto";
import { and, eq, gt, type SQL } from "drizzle-orm";
import { catalogSearchCache } from "~/lib/db/schema";
import { logger, serializeError } from "~/lib/logger";
import type { CatalogMatch, CatalogQuery } from "./types";

// ---------------------------------------------------------------------------
// Minimal drizzle-compatible DB shape required by this module.
// ---------------------------------------------------------------------------

type CacheRow = {
  queryKey: string;
  payload: CatalogMatch[];
  expiresAt: Date;
};

type CacheDb = {
  select: () => {
    from: (table: typeof catalogSearchCache) => {
      where: (condition: SQL | undefined) => Promise<CacheRow[]>;
    };
  };
  insert: (table: typeof catalogSearchCache) => {
    values: (data: {
      queryKey: string;
      payload: CatalogMatch[];
      expiresAt: Date;
    }) => {
      onConflictDoUpdate: (opts: {
        target: (typeof catalogSearchCache)["queryKey"];
        set: { payload: CatalogMatch[]; expiresAt: Date };
      }) => Promise<void>;
    };
  };
};

export type { CacheDb };

// ---------------------------------------------------------------------------
// normalizeQuery
// ---------------------------------------------------------------------------

/**
 * Returns a canonicalized form of the query: each present string field is
 * lowercased, trimmed, and internal whitespace collapsed to a single space.
 * For `issueNumber`, leading zeros are also stripped after normalization.
 * Undefined fields remain undefined.
 */
export function normalizeQuery(query: CatalogQuery): CatalogQuery {
  function normalizeString(s: string): string {
    return s.toLowerCase().trim().replace(/\s+/g, " ");
  }

  const result: CatalogQuery = {};

  if (query.q !== undefined) {
    result.q = normalizeString(query.q);
  }
  if (query.series !== undefined) {
    result.series = normalizeString(query.series);
  }
  if (query.issueNumber !== undefined) {
    const normalized = normalizeString(query.issueNumber);
    // Strip leading zeros (e.g. "007" → "7"), but preserve "0" itself.
    result.issueNumber = normalized.replace(/^0+(\d)/, "$1");
  }

  return result;
}

// ---------------------------------------------------------------------------
// computeQueryKey
// ---------------------------------------------------------------------------

/**
 * Returns the SHA-256 hex digest of the JSON-serialized normalized query.
 * Fields are emitted in a fixed order (q, series, issueNumber); undefined
 * fields are omitted so they do not affect the hash.
 */
export function computeQueryKey(query: CatalogQuery): string {
  const normalized = normalizeQuery(query);

  const stable: Record<string, string> = {};
  if (normalized.q !== undefined) stable.q = normalized.q;
  if (normalized.series !== undefined) stable.series = normalized.series;
  if (normalized.issueNumber !== undefined) stable.issueNumber = normalized.issueNumber;

  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

// ---------------------------------------------------------------------------
// readCache
// ---------------------------------------------------------------------------

/**
 * Returns cached matches for `queryKey` if present and not expired,
 * otherwise `null`.
 */
export async function readCache(
  db: CacheDb,
  queryKey: string,
): Promise<CatalogMatch[] | null> {
  const rows = await db
    .select()
    .from(catalogSearchCache)
    .where(
      and(
        eq(catalogSearchCache.queryKey, queryKey),
        gt(catalogSearchCache.expiresAt, new Date()),
      ),
    );

  const row = rows[0];
  if (!row) return null;

  return row.payload;
}

// ---------------------------------------------------------------------------
// writeCache
// ---------------------------------------------------------------------------

/**
 * Writes `matches` to the cache under `queryKey` with a TTL of `ttlDays`.
 * On conflict (same query_key), updates payload and refreshes expires_at.
 * Best-effort: failures are logged via logger.warn and never thrown.
 */
export async function writeCache(
  db: CacheDb,
  queryKey: string,
  matches: CatalogMatch[],
  ttlDays: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  try {
    await db
      .insert(catalogSearchCache)
      .values({ queryKey, payload: matches, expiresAt })
      .onConflictDoUpdate({
        target: catalogSearchCache.queryKey,
        set: { payload: matches, expiresAt },
      });
  } catch (err) {
    logger.warn("catalog-search: cache write failed", {
      err: serializeError(err),
      queryKey,
    });
  }
}
