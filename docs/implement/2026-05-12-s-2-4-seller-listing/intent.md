# Intent — S-2.4 seller drafts and publishes a listing

## Statement
A verified seller can draft, save, resume, and publish a comic listing from
the mobile app; on publish the listing is immediately queryable from a
public listings index. The run succeeds when the seller flow lands on a
filter-eligible listing without depending on GCD prefill.

## Acceptance Criteria
- AC-1: A signed-in user with seller_accounts.onboarding_status='complete'
  can `POST /api/listings/draft` and receives a draft listing id; the same
  endpoint returns 401 when unauthenticated and 403 when onboarding is
  incomplete (existing `requireSellerOnboarded()` middleware reused).
- AC-2: `POST /api/listings/:id/publish` returns 422 with per-field error
  detail unless the draft has all of: `series` (non-empty), `issue`
  (non-empty), `grade` (enum: Raw, CGC, CBCS, plus numeric grade for slabbed),
  `price_cents` (positive integer), and ≥2 confirmed images
  (`images` rows with `listing_id = :id`).
- AC-3: A successful `POST /api/listings/:id/publish` transitions the row to
  `status='published'`, sets `published_at`, and the listing appears in
  `GET /api/listings?status=published` on the very next request — filter-
  eligibility is synchronous, not eventually-consistent.
- AC-4: `PATCH /api/listings/draft/:id` persists partial state (any subset
  of fields) and `GET /api/listings/draft/:id` returns the latest stored
  draft — including images, selected catalog match (if any), and all
  attribute fields — so the seller can resume across app restarts without
  data loss.
- AC-5: The flow works end-to-end with `catalog_match_id = NULL` (manual
  entry); GCD lookup integration remains optional and absence of a
  `catalog_match_id` does not block draft creation, save, or publish.
- AC-6: A mobile listing creation flow under `app/(app)/sell/` walks the
  seller through create → attributes → photos → review → publish; each
  step's local form state is persisted to the server draft on transition
  (autosave), so unmount/relaunch resumes at the same step.

## Out of Scope
- Buyer-facing browse / marketplace index UI (covered by S-2.5, #8).
- Listing edit / unpublish after publish (admin scope, M3).
- Postgres FTS or facet indexes for keyword/filter search (covered by
  S-2.5, #8 — minimum needed for AC-3 is a status-filtered list query).
- GCD lookup UX integration (S-1.4 is already shipped — adapter available;
  building the picker UI in this run is in-scope, but failure paths beyond
  manual-entry fallback are deferred).
- Image variant generation tuning (S-1.3 pipeline shipped — this run
  consumes confirmed images, does not modify the pipeline).
- Like/Pass/Save persistence (S-2.3, #11).
- Seller dashboard listing-management surface (S-3.5, #23).

## Ontology
- Reused: [seller, listing, draft, catalog match, image, publish]
- Proposed (new): [
    listing-status — enum: draft, published, sold, removed,
    grade-band — Raw vs slabbed (CGC/CBCS + numeric grade 0.5–10.0),
    listing-attributes — series, issue, grade, price_cents, condition_notes
  ]

## Source
kind: issue
ref: 7
hash: 3da8cde2a0eb0d6e2fd4eec777b14f883bf147ac
