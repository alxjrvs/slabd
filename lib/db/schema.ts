import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

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

export const listingImages = pgTable("images", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull(),
  r2Key: text("r2_key").notNull(),
  position: integer("position").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
