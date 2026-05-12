# Ontology updates — s-1-2-stripe-connect

Proposed during `implement:define`. Merged into `docs/glossary/` at ship.

## New terms

- **`stripe_account_link`** — Short-lived Stripe-hosted onboarding URL
  returned by `POST /api/onboarding/start`. Distinct from a Stripe
  *Account* (the persistent entity) or a *Login Link* (post-onboarding
  dashboard access).
- **`stripe_webhook_event`** — Row in `stripe_webhook_events` recording
  a processed Stripe event ID. Used to make webhook handlers
  idempotent against re-delivery.
- **`seller_onboarding_status`** — Domain state machine value for a
  seller's Stripe Connect onboarding progress. Union:
  `not_started | pending | complete | restricted`. `not_started` is
  synthesized at the API layer when no `seller_accounts` row exists.
- **`seller_publish_gate`** — Hono middleware
  (`requireSellerOnboarded()`) that returns
  `403 { error: "onboarding_required" }` when the current user's
  `seller_onboarding_status !== "complete"`.

## Refinements to existing terms

- **`seller_account`** (introduced in #46): row in `seller_accounts`.
  S-1.2 confirms the columns become load-bearing — `stripe_account_id`
  and `onboarding_status` are populated and read by the onboarding +
  gate flows.

## Status

- Pending review at ship.
