# ADR 0002 — Draft → Publish state machine + endpoint shape

**Status:** Accepted (S-2.4, 2026-05-12)

## Context

The seller listing flow has four operations: create a draft, save partial
progress, publish, and resume (the seller closes and reopens the app). The
endpoint shape needs to support all four cleanly while keeping the publish
gate auditable and the validation surface focused.

## Decisions

### Four endpoints, not one

Adopted:
- `POST   /api/listings/draft`            — create new draft (returns `{ id }`)
- `PATCH  /api/listings/draft/:id`        — partial update (any subset of fields)
- `GET    /api/listings/draft/:id`        — resume (returns full state)
- `POST   /api/listings/:id/publish`      — state transition draft → published

Plus the already-shipped image endpoints, which key off the same listing id:
- `POST   /api/listings/:id/images/upload-url` (S-1.3)
- `POST   /api/listings/:id/images/confirm`    (S-1.3)
- `GET    /api/listings/:id/images`            (S-1.3, public)

Rejected: a single "upsert" endpoint that switches behavior on body shape.

**Why.** Each endpoint has a distinct contract: `POST /draft` always
creates; `PATCH /draft/:id` always merges; `POST /:id/publish` is the gate
that runs the full validation suite. Conflating them makes the validation
surface non-obvious and routes harder to reason about.

`POST /:id/publish` lives under `/api/listings/:id/` (not `/api/listings/draft/`)
because publish operates on the listing as a whole — including images that
were attached via the existing `images` endpoints — and because the eventual
admin operations (unpublish, take down) will live under the same `/:id/`
prefix.

### Validation only at publish — not at PATCH

Adopted: `PATCH /api/listings/draft/:id` accepts *any* subset of attribute
fields without validation beyond type-coercion (e.g., `price_cents` must
parse as an integer if present). `POST /api/listings/:id/publish` is the
single gate that enforces the full required-field set.

Rejected: progressive validation per step.

**Why.** Save-and-resume requires partial state to persist. If PATCH
rejected incomplete drafts, the seller can't save progress mid-flow. The
mobile UI walks them through fields step by step (cycle-6); the server's
job is to faithfully persist whatever the client sends and only enforce
the publish gate at publish time. This also keeps validation logic in
one place (the publish handler).

### Ownership gate at every authenticated endpoint

Adopted: every draft endpoint and the publish endpoint runs `clerkAuth()`
+ `requireSellerOnboarded()`, then re-checks `seller_user_id == userId`
on the loaded row and returns 403 otherwise.

The ownership check happens *in the handler*, not as middleware, because
it needs the row (`:id` resolves to a listing owned by *someone*). 404 vs
403 distinction: return 404 only when the row genuinely doesn't exist;
return 403 when it exists but the requester isn't the owner.

### Atomic publish

Adopted: publish is a single sequential validation-then-update transaction:

1. Load draft (404 if missing, 403 if not owner, 409 if already published).
2. Run validation (assemble per-field error map, return 422 on any failure).
3. Count `images` rows (must be ≥2).
4. `UPDATE listings SET status='published', published_at=now() WHERE id=:id AND status='draft'`.
5. Return the updated row.

The `AND status='draft'` predicate in step 4 prevents double-publish under
race; if rows-affected=0 after step 1 said it was draft, we surface 409.

Drizzle on Neon HTTP doesn't expose multi-statement transactions; the
sequential pattern matches S-1.2 + S-1.3 precedent and is acceptable here
because the only concurrent path is the same seller hitting publish twice
(low contention).

### Filter-eligibility is synchronous

Adopted: AC-3 ("the listing is filter-eligible immediately") is satisfied
by writing `published_at=now()` and `status='published'` in the same
UPDATE. The marketplace `GET /api/listings?status=published` reads the
same row on the next request. No async queue, no eventual consistency.

**Why.** AC-3 says *immediately*. A queue would let the seller see "not
yet visible" after publish, which is precisely the race the gherkin SLO
prohibits. The 30-second SLO in the issue body is a worst-case ceiling; we
hit it trivially with synchronous writes.

(Future: when the swipe-deck composer caches deck pages — 2A — the cache
will need an invalidation hook on publish. That's a 2A concern, not 2.4.)

## Consequences

- The publish handler is the single place validation lives; cycle-3's test
  matrix is the validation contract.
- PATCH accepts arbitrarily incomplete state and never 422s on missing
  required fields — the seller can save anything.
- The mobile flow (cycle-6) is straightforward: PATCH after each step,
  call publish at the end.
- Race-on-double-publish is handled at the SQL predicate level (409).
- Filter-eligibility tests can use a simple "publish then list" sequence
  with no waits or polling.
