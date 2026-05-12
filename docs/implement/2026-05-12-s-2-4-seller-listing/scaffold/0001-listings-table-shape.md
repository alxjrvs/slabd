# ADR 0001 — Listings table shape

**Status:** Accepted (S-2.4, 2026-05-12)

## Context

S-2.4 introduces the first writable table that buyers (and later, the swipe
deck, curation, commerce, and admin units) will all read from. The shape
chosen here is load-bearing for M2 and beyond. Two cross-cutting decisions
need to be locked before code: (1) draft vs published as separate tables or
one with status column; (2) grade representation.

## Decisions

### One `listings` table with `status` column (not separate draft/published tables)

Adopted: single table; column `status text NOT NULL DEFAULT 'draft'` with
allowed values `draft | published | sold | removed`.

Rejected: separate `listing_drafts` + `listings` tables.

**Why.** Publish becomes a state transition (one UPDATE) instead of a
copy-and-delete dance. Image FKs (`images.listing_id`) point at the same id
across draft and published states — no rewriting. Queries that need to
exclude drafts use `WHERE status = 'published'`; this is the substrate for
the open-marketplace list, the future swipe deck composer (2A), and the
curator deck builder (2C). Drafts and published rows share an id, so deep
links survive publish.

The cost: every public read filters by status. Acceptable. A partial index
`CREATE INDEX listings_published_idx ON listings(published_at DESC) WHERE
status = 'published'` keeps the marketplace query selective.

### Grade as two columns: `grade_company` (enum-as-text) + `grade_numeric` (decimal nullable)

Adopted: `grade_company text NOT NULL` with allowed `'Raw' | 'CGC' | 'CBCS'`;
`grade_numeric numeric(3,1) NULL` required when `grade_company != 'Raw'`.

Rejected: a single `grade text` (free-form like "CGC 9.8") or a `grades`
join table.

**Why.** Buyers filter by grade band (e.g., "CGC 9.0+", or "Raw only"). A
single text column makes range queries painful and prone to data-quality
drift. A join table is overkill for a fixed two-axis schema. Two columns
keep both filter axes cheap (`grade_company IN (...) AND grade_numeric >=
9.0`) and the data shape obvious.

`grade_numeric numeric(3,1)` admits 0.5–10.0 in 0.5 steps; the application
layer enforces the 0.5 quantization on the way in.

### `catalog_match_id` is nullable (manual entry is first-class)

Adopted: `catalog_match_id text NULL`. No foreign-key constraint at the DB
level — `catalog_match_id` resolves to a GCD catalog id (external system,
shipped in S-1.4 as a fixture-backed adapter; no internal catalog table
yet).

**Why.** PRD AC-5 requires manual entry to remain valid. The seller may
publish without ever calling the GCD adapter (GCD is degradable per S-1.4).
No FK means no cross-table dependency on a not-yet-internalized catalog,
and no breakage if a GCD id becomes stale.

Future: when an internal catalog table lands (M3 admin or later), add an
optional FK then.

### Money as `price_cents integer`, not `decimal`

Adopted: `price_cents integer NOT NULL` (when required).

**Why.** Cents-as-integer is the universal marketplace convention; matches
Stripe Connect's `amount` representation directly (1C POC already uses this).
Avoids floating-point pitfalls in tax/fee math (relevant for 2D commerce).

### `seller_user_id text NOT NULL REFERENCES users.id`

Adopted: FK to `users.id`, indexed.

**Why.** Owner-scoped queries (seller dashboard, draft resume) are
frequent. FK + index pays for itself. The reference is `users.id` (Clerk
user id mirrored locally) — same pattern as `seller_accounts.user_id`.

## Consequences

- The publish endpoint is a state-transition UPDATE, not a row creation.
- The marketplace list filters by `status = 'published'`; a partial index
  keeps it selective.
- Grade-band filters (deferred to S-2.2 #10) get O(log n) range scans without
  rework.
- Manual entry path costs zero code branches at the DB layer — just a NULL
  field. Application-layer validation (cycle-3) handles the user-facing
  rules.
- `images.listing_id` continues to reference `listings.id` across draft +
  published — no migration churn.
- Grade enums are enforced at the application layer (Zod-style validation
  in cycle-3), not as a Postgres CHECK constraint, to match how other
  enum-as-text columns in this codebase already work (`onboarding_status`,
  catalog cache fields).
