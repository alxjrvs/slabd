/**
 * GET /api/listings
 *
 * PUBLIC endpoint — no Clerk gate.
 *
 * Returns a paginated list of published listings ordered by publishedAt DESC.
 *
 * Query params:
 *   status  — only 'published' is supported (default: 'published')
 *   limit   — integer 1..100 (default: 50)
 *   offset  — integer ≥0 (default: 0)
 *
 * Response: { listings: [...], total }
 *   listings items: { id, series, issue, gradeCompany, gradeNumeric, priceCents, publishedAt }
 *   total: count of all matching rows (without pagination)
 */

import type { Context } from "hono";
import { eq, desc, count } from "drizzle-orm";

import { logger, serializeError } from "~/lib/logger";
import { db as defaultDb } from "~/lib/db";
import { listings } from "~/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListingRow = {
  id: string;
  series: string | null;
  issue: string | null;
  gradeCompany: string | null;
  gradeNumeric: string | null;
  priceCents: number | null;
  publishedAt: Date | null;
};

type CountRow = {
  count: number;
};

// Two typed interfaces for the two distinct query shapes the handler issues.
// This avoids a union return type on `where()` which TypeScript can't narrow
// without a discriminant.

type ListQueryDb = {
  select: () => {
    from: (table: typeof listings) => {
      where: (condition: ReturnType<typeof eq>) => {
        orderBy: (...columns: ReturnType<typeof desc>[]) => {
          limit: (n: number) => {
            offset: (n: number) => Promise<ListingRow[]>;
          };
        };
      };
    };
  };
};

type CountQueryDb = {
  select: (fields: { count: ReturnType<typeof count> }) => {
    from: (table: typeof listings) => {
      where: (condition: ReturnType<typeof eq>) => Promise<CountRow[]>;
    };
  };
};

// The public dep type is the intersection — any real Drizzle db satisfies both.
export type ListingsListDb = ListQueryDb & CountQueryDb;

export interface ListingsListDeps {
  db?: ListingsListDb;
}

// ---------------------------------------------------------------------------
// Param parsing helpers
// ---------------------------------------------------------------------------

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return 50;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) return null;
  return n;
}

function parseOffset(raw: string | undefined): number | null {
  if (raw === undefined) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function listingsListHandler(deps: ListingsListDeps = {}) {
  return async (c: Context): Promise<Response> => {
    // -- Status validation --
    const statusParam = c.req.query("status") ?? "published";
    if (statusParam !== "published") {
      return c.json({ error: "invalid_status" }, 400);
    }

    // -- Pagination validation --
    const limit = parseLimit(c.req.query("limit"));
    if (limit === null) {
      return c.json({ error: "invalid_pagination" }, 400);
    }
    const offset = parseOffset(c.req.query("offset"));
    if (offset === null) {
      return c.json({ error: "invalid_pagination" }, 400);
    }

    const listDb = (deps.db ?? defaultDb) as unknown as ListQueryDb;
    const countDb = (deps.db ?? defaultDb) as unknown as CountQueryDb;

    let rows: ListingRow[];
    let total: number;

    try {
      // List query — ordered by publishedAt DESC with pagination
      rows = await listDb
        .select()
        .from(listings)
        .where(eq(listings.status, "published"))
        .orderBy(desc(listings.publishedAt))
        .limit(limit)
        .offset(offset);

      // Count query — separate call; no window function.
      // Neon HTTP driver does not support transactions, so sequential awaited
      // reads are the correct pattern here.
      const countRows = await countDb
        .select({ count: count() })
        .from(listings)
        .where(eq(listings.status, "published"));
      total = countRows[0]?.count ?? 0;
    } catch (err) {
      logger.error("listings-list: failed to query listings", {
        err: serializeError(err),
      });
      return c.json({ error: "internal_error" }, 500);
    }

    const output = rows.map((r) => ({
      id: r.id,
      series: r.series,
      issue: r.issue,
      gradeCompany: r.gradeCompany,
      gradeNumeric: r.gradeNumeric,
      priceCents: r.priceCents,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    }));

    return c.json({ listings: output, total }, 200);
  };
}
