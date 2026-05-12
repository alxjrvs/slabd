# Ontology updates — 2026-05-11-backend-scaffold-baseline

## Proposed (from intent.md)

- `seller_account` — DB-side representation of a Stripe Connect account
  binding. Distinct from the eventual `seller_profile` UI concept.
- `clerk_auth_middleware` — Hono middleware that verifies Clerk JWTs and
  hydrates `c.var.userId`.
- `api_route_handler` — Expo Router `+api.ts` file that delegates to a
  Hono application.

## Status

`proposed` — accrete across cycles. Final acceptance happens at Phase 5
(ship). Reject any term that turns out to be a synonym of an existing
canonical concept.
