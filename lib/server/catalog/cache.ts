import type { CatalogMatch, CatalogQuery } from "./types";

// Opaque db type — cycle-2 will import the real drizzle db type.
// TODO(cycle-2): replace AnyDb with the actual drizzle NeonDatabase type.
type AnyDb = any; // nocheck

/**
 * Returns a canonicalized form of the query (lowercased, whitespace-collapsed,
 * trimmed) so equivalent searches map to the same cache key.
 *
 * @throws {Error} not_implemented — cycle-2 will implement.
 */
export function normalizeQuery(_q: CatalogQuery): CatalogQuery {
  throw new Error("not_implemented (cycle-2)");
}

/**
 * Returns the SHA-256 hex digest of the JSON-serialized normalized query.
 *
 * @throws {Error} not_implemented — cycle-2 will implement.
 */
export function computeQueryKey(_q: CatalogQuery): string {
  throw new Error("not_implemented (cycle-2)");
}

/**
 * Returns cached matches for `queryKey` if present and not expired,
 * otherwise `null`.
 *
 * @throws {Error} not_implemented — cycle-2 will implement.
 */
export async function readCache(
  _db: AnyDb,
  _queryKey: string,
): Promise<CatalogMatch[] | null> {
  throw new Error("not_implemented (cycle-2)");
}

/**
 * Writes `matches` to the cache under `queryKey` with a TTL of `ttlDays`.
 * Best-effort — callers must not await success semantics.
 *
 * @throws {Error} not_implemented — cycle-2 will implement.
 */
export async function writeCache(
  _db: AnyDb,
  _queryKey: string,
  _matches: CatalogMatch[],
  _ttlDays: number,
): Promise<void> {
  throw new Error("not_implemented (cycle-2)");
}
