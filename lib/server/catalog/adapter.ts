import type { CatalogMatch, CatalogQuery } from "./types";

export interface CatalogAdapter {
  search(query: CatalogQuery): Promise<CatalogMatch[]>;
}
