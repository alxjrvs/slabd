import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { CatalogMatch } from "../server/catalog/types";

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sellerAccounts = pgTable("seller_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  stripeAccountId: text("stripe_account_id"),
  onboardingStatus: text("onboarding_status").notNull().default("pending"),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const catalogSearchCache = pgTable("catalog_search_cache", {
  queryKey: text("query_key").primaryKey(),
  payload: jsonb("payload").$type<CatalogMatch[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  sellerUserId: text("seller_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("draft"),
  series: text("series"),
  issue: text("issue"),
  gradeCompany: text("grade_company"),
  gradeNumeric: numeric("grade_numeric", { precision: 3, scale: 1 }),
  priceCents: integer("price_cents"),
  conditionNotes: text("condition_notes"),
  catalogMatchId: text("catalog_match_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingImages = pgTable("images", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  r2Key: text("r2_key").notNull(),
  position: integer("position").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
