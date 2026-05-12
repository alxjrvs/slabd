# Ontology Updates — S-2.4

Proposed canonical terms for `docs/ontology.md` (if/when consolidated):

## listing-status
**Enum:** `draft | published | sold | removed`
- `draft` — seller is still editing; not visible to buyers.
- `published` — listing is filter-eligible in the open marketplace.
- `sold` — purchased; reserved (or finalized post-payout in 2D scope).
- `removed` — admin or seller takedown.

State transitions (this run scope = draft → published only):
- `draft → published` via `POST /api/listings/:id/publish` (this run).
- `published → sold` via order finalization (2D, deferred).
- `published → removed` via admin takedown (M3, deferred).

## grade-band
A listing's grade is one of:
- `Raw` — ungraded.
- `CGC <numeric>` — Certified Guaranty Company slab, grade 0.5–10.0 in 0.5 steps.
- `CBCS <numeric>` — Comic Book Certification Service slab, same grade range.

Storage shape (this run): two columns — `grade_company` (enum: 'Raw' | 'CGC' | 'CBCS')
and `grade_numeric` (decimal nullable; required when company ≠ 'Raw').

## listing-attributes (required at publish)
- `series` — text, non-empty (e.g., "Amazing Spider-Man").
- `issue` — text, non-empty (e.g., "300" or "Annual 14").
- `grade_company` — enum above.
- `grade_numeric` — decimal, nullable; required when company ≠ 'Raw'.
- `price_cents` — positive integer.
- ≥2 confirmed images linked by `images.listing_id`.
- `catalog_match_id` — nullable; manual-entry remains valid.
- `condition_notes` — text, optional.

## proposed terms — not yet ontology-canonical
These remain in this updates doc until `docs/ontology.md` exists; future
runs (S-2.5, S-2.6, S-2.7) will reuse them. Merge at M2 close.
