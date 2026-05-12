CREATE TABLE "catalog_search_cache" (
	"query_key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "catalog_search_cache_expires_at_idx" ON "catalog_search_cache" ("expires_at");
