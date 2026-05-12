# Cycle 2 — Draft CRUD Endpoints (S-2.4)

## Scope

Three Hono handler factories for draft listing management:

- `POST /api/listings/draft` — create empty draft, return `{ id }`
- `PATCH /api/listings/draft/:id` — partial merge of attribute fields, owner-only, draft-only
- `GET /api/listings/draft/:id` — full draft state with images joined, owner-only

## Design choices

### Handler factory pattern
All three mirror `listings-images-confirm.ts` exactly: exported `Deps` interface with optional `db`, `randomUUID`, `now` for full test injection without mocks leaking into production code.

### DB abstraction
Each handler carries its own narrow DB type interface matching exactly the Drizzle methods it uses. This keeps the handler self-documenting and prevents accidental usage of transaction-style patterns (Neon HTTP driver has no transactions — sequential awaited writes are explicit).

### GET images query
The real Drizzle chain is `.select().from(listingImages).where(...).orderBy(asc(...))`. The test mock implements `.where()` returning a thenable with `.orderBy()` to match this exact chain — no double-fallback pattern, clean and deterministic.

### PATCH field extraction
`extractPatchFields()` explicitly whitelists known keys and type-checks each. Unknown fields are silently dropped. Bad types (e.g. `priceCents: "not-a-number"`) return `400 invalid_body`. No required-field validation — mid-draft saves are the feature.

### Status gate (PATCH only)
PATCH returns `409 not_draft` if `status !== 'draft'`. GET does not enforce status — sellers can view any listing they own.

## Coverage

22 tests across 3 files. Verified: RED (module not found), GREEN (all pass), refactor (lint fix + GET mock cleanup), full suite impact neutral (17 pre-existing catalog cache failures unchanged from cycle-1).

## ACs covered

- AC-1: POST /api/listings/draft — 201 with id, status=draft, sellerUserId from context
- AC-4: PATCH merges partial fields, 403 non-owner, 409 non-draft; GET returns full state + images[], 403 non-owner
