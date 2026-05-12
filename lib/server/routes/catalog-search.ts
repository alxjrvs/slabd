/**
 * GET /api/catalog/search
 *
 * Clerk-gated. Accepts ?q=<free text> OR ?series=<s>&issueNumber=<n>.
 * Returns 200 { matches, cacheHit, degraded }.
 * Returns 400 { error: "invalid_query" } on empty/whitespace-only input.
 * Never returns 5xx — adapter failures degrade to { matches: [], degraded: true }.
 *
 * AC-2: endpoint contract
 * AC-4: 1400ms timeout + degradation contract
 */

import type { Context } from "hono";

import { logger, serializeError } from "~/lib/logger";
import {
  normalizeQuery,
  computeQueryKey,
  readCache,
  writeCache,
  type CacheDb,
} from "~/lib/server/catalog/cache";
import type { CatalogAdapter } from "~/lib/server/catalog/adapter";
import type { CatalogMatch } from "~/lib/server/catalog/types";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADAPTER_TIMEOUT_MS = 1400;

// Sentinel value used in Promise.race to distinguish a timeout from real results.
const TIMEOUT_SENTINEL = "__timeout" as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogSearchDeps = {
  db: CacheDb;
  adapter: CatalogAdapter;
  env: { CATALOG_CACHE_TTL_DAYS: number };
  logger?: typeof logger;
};

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal,
): Promise<T | typeof TIMEOUT_SENTINEL> {
  const timeout = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    const timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve(TIMEOUT_SENTINEL);
    });
  });
  return Promise.race([promise, timeout]);
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function createCatalogSearchHandler(deps: CatalogSearchDeps) {
  const log = deps.logger ?? logger;

  return async (c: Context<{ Variables: AppVars }>): Promise<Response> => {
    const q = c.req.query("q");
    const series = c.req.query("series");
    const issueNumber = c.req.query("issueNumber");

    // Validate: q must be non-empty OR (series non-empty AND issueNumber non-empty).
    const hasQ = typeof q === "string" && q.trim().length > 0;
    const hasStructured =
      typeof series === "string" &&
      series.trim().length > 0 &&
      typeof issueNumber === "string" &&
      issueNumber.trim().length > 0;

    if (!hasQ && !hasStructured) {
      return c.json({ error: "invalid_query" }, 400);
    }

    // Build the raw query object, then normalize.
    const rawQuery = hasQ
      ? { q: q as string }
      : { series: series as string, issueNumber: issueNumber as string };

    const normalized = normalizeQuery(rawQuery);
    const key = computeQueryKey(normalized);

    // Cache check.
    let cached: CatalogMatch[] | null = null;
    try {
      cached = await readCache(deps.db, key);
    } catch (err) {
      log.warn("catalog-search: cache read failed, treating as miss", {
        err: serializeError(err),
        queryKey: key,
        query: normalized,
      });
    }

    if (cached !== null) {
      return c.json({ matches: cached, cacheHit: true, degraded: false }, 200);
    }

    // Cache miss — race adapter against timeout.
    const controller = new AbortController();
    const adapterPromise = deps.adapter.search(normalized);

    let result: CatalogMatch[] | typeof TIMEOUT_SENTINEL;
    try {
      result = await withTimeout(adapterPromise, ADAPTER_TIMEOUT_MS, controller.signal);
    } catch (err) {
      // Adapter threw synchronously or returned a rejected promise.
      log.warn("catalog-search: adapter failed", {
        err: serializeError(err),
        query: normalized,
      });
      return c.json({ matches: [], cacheHit: false, degraded: true }, 200);
    }

    if (result === TIMEOUT_SENTINEL) {
      controller.abort();
      log.warn("catalog-search: adapter failed", {
        err: serializeError(new Error("adapter timeout exceeded 1400ms")),
        query: normalized,
      });
      return c.json({ matches: [], cacheHit: false, degraded: true }, 200);
    }

    // Adapter succeeded — best-effort cache write.
    void writeCache(deps.db, key, result, deps.env.CATALOG_CACHE_TTL_DAYS);

    return c.json({ matches: result, cacheHit: false, degraded: false }, 200);
  };
}
