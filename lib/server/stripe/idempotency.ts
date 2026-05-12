/**
 * Webhook event idempotency helper.
 *
 * Uses `stripe_webhook_events(event_id PK, received_at)` to record each
 * processed Stripe event ID. INSERT … ON CONFLICT DO NOTHING returns the
 * row only on the first insert, letting callers detect duplicates cleanly.
 *
 * The `db` parameter is injectable for testability — in production, pass
 * the `db` proxy from `~/lib/db`.
 */

import { stripeWebhookEvents } from "~/lib/db/schema";

/** Minimal Drizzle-compatible DB shape required by recordEvent. */
type InsertableDb = {
  insert: (table: typeof stripeWebhookEvents) => {
    values: (data: { eventId: string }) => {
      onConflictDoNothing: () => {
        returning: (fields: { eventId: typeof stripeWebhookEvents.eventId }) => { eventId: string }[] | Promise<{ eventId: string }[]>;
      };
    };
  };
};

/**
 * Record a Stripe webhook event ID for idempotency.
 *
 * Returns `{ inserted: true }` on first delivery, `{ inserted: false }` on
 * duplicate. Callers should skip side-effects when `inserted` is false.
 */
export async function recordEvent(
  db: InsertableDb,
  eventId: string,
): Promise<{ inserted: boolean }> {
  const result = await db
    .insert(stripeWebhookEvents)
    .values({ eventId })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });

  return { inserted: result.length > 0 };
}
