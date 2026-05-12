# ADR 0002 — Webhook idempotency via dedicated event table

**Status:** Accepted (2026-05-11)
**Context:** S-1.2 Stripe Connect Express seller onboarding (#3)

## Context

Stripe webhooks are delivered at-least-once. Stripe explicitly recommends
treating re-delivery as routine: a single state-change can produce
multiple HTTP POSTs with the same `event.id`, and a slow handler can
trigger Stripe's retry policy mid-flight. Without de-duplication, a
re-delivered `account.updated` could re-apply stale state to
`seller_accounts` (e.g., flipping a freshly-`restricted` row back to
`complete` from an older event).

Options considered:

1. **Dedicated `stripe_webhook_events(event_id PK, received_at)` table.**
   Insert each event ID with `ON CONFLICT DO NOTHING`; the affected
   row count tells us whether this is the first delivery.
2. **`last_webhook_event_id` column on `seller_accounts`.** Cheaper
   (no new table) but only de-dupes per-account; cross-account events
   and account-less events can't use it.
3. **Compare `event.created` against a `seller_accounts.updated_at`
   timestamp.** Avoids new state, but relies on clock-monotone events
   from Stripe — fragile under retries that span our own writes.
4. **In-memory cache.** Trivially wrong under Workers cold starts
   and horizontal scale.

## Decision

Use a dedicated `stripe_webhook_events` table (option 1).

```sql
CREATE TABLE stripe_webhook_events (
  event_id    text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

The webhook handler performs `INSERT … VALUES ($eventId, now()) ON
CONFLICT (event_id) DO NOTHING RETURNING event_id`. If the result is
empty, this is a duplicate delivery — return `200` without applying
side effects. Otherwise proceed with the event handler.

## Consequences

**Positive:**

- Single-statement de-dup that survives Workers cold starts, horizontal
  scaling, and out-of-order delivery.
- Works for *any* future event type — not just `account.updated`.
- Table doubles as an audit trail: every event Stripe sent us, when
  we received it.

**Negative:**

- Table grows unbounded. A retention job (cron/manual prune of rows
  older than 90 days) is needed eventually. Out of scope for S-1.2 —
  surface in scaffold README and S-3.x.
- One extra round-trip per webhook delivery. Acceptable; webhook
  handlers run async from the user-facing flow.

## Implementation notes

A helper `lib/server/stripe/idempotency.ts` exposes
`recordEvent(db, eventId): Promise<{ inserted: boolean }>` that
encapsulates the INSERT … ON CONFLICT pattern. The webhook handler
calls it once before applying the event. The webhook handler itself
remains thin — verify signature, parse event, dedup, dispatch by
`event.type`, return `200`.

## Alternatives rejected

- **Column on `seller_accounts` (option 2):** doesn't generalize to
  future webhooks unrelated to accounts.
- **Timestamp comparison (option 3):** fragile under clock skew and
  re-delivery semantics.
- **In-memory cache (option 4):** wrong under our deploy topology.
