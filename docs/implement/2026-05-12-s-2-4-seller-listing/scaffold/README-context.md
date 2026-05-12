# S-2.4 — Context

## What this run delivers

The first writable, publishable, queryable listing in the marketplace. Before
this run: the listing-stub returns 204 No Content. After this run: a seller
can draft, save, resume, and publish a comic listing; buyers (and the future
swipe deck) can query the open marketplace via `GET /api/listings`.

This is the **2B foundation** that gates the rest of M2: 2A swipe deck reads
from `listings`; 2D commerce buys a listing; 2C curation cherry-picks from
listings.

## Dependencies already in place

- S-1.1 (#1): user auth, profile, Clerk session bootstrap.
- S-1.2 (#3): Stripe Connect Express onboarding — `seller_accounts.onboarding_status`
  is the gate for write access.
- S-1.3 (#4): image upload pipeline — `images` table, R2 signed URLs, CF
  Images variants. Already FK-keyed by `listing_id`.
- S-1.4 (#6): GCD catalog adapter — fixture-backed, TTL-cached. Optional
  in the seller flow; manual entry remains valid.
- S-1.5 (#5): observability baseline — `logger`, `serializeError`, Sentry
  breadcrumbs.
- S-1.7 (#2): CI parity gates (typecheck, lint, test) run on every PR.

## What this run does NOT deliver (deferred to follow-up M2 stories)

- Listing browse UI / filters / search (S-2.5 #8 — buyer-facing marketplace).
- Swipe deck consumption of listings (S-2.1 #9, S-2.2 #10, S-2.3 #11 — 2A).
- Listing edit after publish, unpublish, takedown (admin scope — M3 #23).
- Listing detail page UI for buyers (S-2.5 #8).
- Listing-side listing dashboard for sellers (S-3.5 #23).

## Surface inventory after this run

### New tables
- `listings` — see ADR 0001.

### New endpoints
- `POST   /api/listings/draft` (Clerk + onboarding gate).
- `PATCH  /api/listings/draft/:id` (Clerk + onboarding + ownership).
- `GET    /api/listings/draft/:id` (Clerk + onboarding + ownership).
- `POST   /api/listings/:id/publish` (Clerk + onboarding + ownership).
- `GET    /api/listings?status=published` (public; minimum needed for AC-3).

### Removed
- `POST /api/listings` (the S-1.3-shipped stub returning 204) — superseded by
  the new `POST /api/listings/draft`.

### New app screens
- `/sell` (Expo Router segment): start → attributes → photos → review → publish.

## Test seams

- DB: injectable mock via `{ db }` deps option, per S-1.2/S-1.3 precedent.
- Clerk auth: `clerkAuth({ verifyToken })` injectable per the existing
  `ClerkAuthOptions`.
- Onboarding gate: reused as-is.
- Image confirmation: existing `listings-images-confirm` handler reused.
- Catalog search: reused; not required to call.
