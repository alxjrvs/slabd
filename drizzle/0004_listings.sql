CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"series" text,
	"issue" text,
	"grade_company" text,
	"grade_numeric" numeric(3, 1),
	"price_cents" integer,
	"condition_notes" text,
	"catalog_match_id" text,
	"published_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "listings_seller_user_id_idx" ON "listings" ("seller_user_id");
--> statement-breakpoint
CREATE INDEX "listings_published_idx" ON "listings" ("published_at" DESC) WHERE "status" = 'published';
--> statement-breakpoint
-- Tighten the deferred FK on images.listing_id now that listings exists (S-1.3 left this for S-2.4).
ALTER TABLE "images" ADD CONSTRAINT "images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE no action ON UPDATE no action;
