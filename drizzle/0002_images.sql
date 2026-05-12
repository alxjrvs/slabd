CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"position" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
-- FK to listings(id) added in S-2.4
