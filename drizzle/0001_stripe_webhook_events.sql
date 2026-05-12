CREATE TABLE "stripe_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"received_at" timestamptz DEFAULT now() NOT NULL
);
