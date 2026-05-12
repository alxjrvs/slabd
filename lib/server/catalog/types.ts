export type CatalogQuery = {
  q?: string;
  series?: string;
  issueNumber?: string;
};

export type CatalogMatch = {
  catalogId: string;
  series: string;
  issueNumber: string;
  variant?: string;
  publisher?: string;
  publishedYear?: number;
  coverThumbnailUrl?: string;
};
