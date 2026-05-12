import type { CatalogAdapter } from "./adapter";
import fixtureData from "./fixtures/issues.json";
import type { CatalogMatch, CatalogQuery } from "./types";

const ALL_ISSUES: CatalogMatch[] = fixtureData as CatalogMatch[];

/**
 * Parses a free-text `q` string into a structured query.
 *
 * Handles the pattern "Series Name #N" — the trailing `#N` token is extracted
 * as `issueNumber` and the remainder becomes the series search text.
 *
 * Examples:
 *   "Amazing Spider-Man #129" → { series: "Amazing Spider-Man", issueNumber: "129" }
 *   "Batman"                  → { series: "Batman" }
 */
function parseQ(q: string): { series: string; issueNumber?: string } {
  const match = q.trim().match(/^(.*?)\s*#(\d+)\s*$/) ?? null;
  if (match !== null) {
    return { series: (match[1] ?? "").trim(), issueNumber: match[2] ?? "" };
  }
  return { series: q.trim() };
}

/**
 * FixtureCatalogAdapter — loads from lib/server/catalog/fixtures/issues.json.
 *
 * Search behaviour:
 *   - `series` (from structured query or parsed from `q`): case-insensitive
 *     substring match against each entry's `series` field.
 *   - `issueNumber` (from structured query or parsed `#N` from `q`): exact
 *     string match (after trimming).
 *   - Results are sorted by `catalogId` for stable ordering.
 *
 * TODO(S-1.4-followup): Replace with GCDCatalogAdapter once licensing is settled.
 */
export class FixtureCatalogAdapter implements CatalogAdapter {
  async search(query: CatalogQuery): Promise<CatalogMatch[]> {
    let seriesFilter: string | undefined;
    let issueNumberFilter: string | undefined;

    if (query.q) {
      const parsed = parseQ(query.q);
      seriesFilter = parsed.series || undefined;
      issueNumberFilter = parsed.issueNumber;
    }

    // Structured fields override parsed q fields when present.
    if (query.series) {
      seriesFilter = query.series;
    }
    if (query.issueNumber) {
      issueNumberFilter = query.issueNumber;
    }

    let results = ALL_ISSUES;

    if (seriesFilter) {
      const lower = seriesFilter.toLowerCase();
      results = results.filter((issue) =>
        issue.series.toLowerCase().includes(lower),
      );
    }

    if (issueNumberFilter !== undefined) {
      const target = issueNumberFilter.trim();
      results = results.filter((issue) => issue.issueNumber.trim() === target);
    }

    return [...results].sort((a, b) => a.catalogId.localeCompare(b.catalogId));
  }
}
