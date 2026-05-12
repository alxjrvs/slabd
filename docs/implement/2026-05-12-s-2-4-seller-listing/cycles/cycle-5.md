# Cycle 5 — Wire Routes + Lifecycle Integration (S-2.4 #7)

## Scope

Mount the five new listing handlers (cycles 2/3/4) into `createApp()`, delete
the obsolete `listings-stub.ts`, and prove the full draft → publish → list
lifecycle works end-to-end via an integration walk test.

## Files Modified / Created

- `lib/server/app.ts` (M) — imports + deps + route registrations for the five
  new handlers; deletes the stub mount.
- `lib/server/routes/listings-stub.ts` (D) — superseded by the new
  `POST /api/listings/draft`.
- `lib/server/__tests__/listings-gate.test.ts` (M) — updated to target the
  new draft endpoint (the 401/403 gate now sits on `/api/listings/draft`).
- `lib/server/__tests__/listings-lifecycle-integration.test.ts` (A) — full
  walk: create draft → update → get → publish → list. Covers AC-1 and AC-5.

## Design Choices

### Route ordering: PUBLIC list before `/:id/publish`

Hono's pattern matcher tests routes in registration order. To keep
`GET /api/listings` PUBLIC while `/api/listings/:id/publish` is Clerk-gated,
the PUBLIC index is registered first. A comment marks the invariant for
future maintainers.

### Onboarding gate scoped per-mount

Rather than mount `requireSellerOnboarded()` once on `/api/listings`, each
write endpoint (`/draft`, `/draft/:id`, `/:id/publish`) gets its own
`app.use(...)` chain. This keeps the PUBLIC index off the auth path entirely.

### Integration walk uses real createApp() composition

The integration test calls the same `createApp({ ... })` factory that
production uses, only swapping the DB and the Clerk verifier with in-memory
mocks. This catches wiring regressions (missing imports, wrong middleware
order, route shadowing) that per-handler unit tests cannot.

## Coverage Notes

- 3 tests, 40 expect() calls.
- AC-1 (persistence across resume): patches a draft, then re-fetches and
  asserts the patched values land.
- AC-5 (public listings index no auth): two assertions — request without
  Authorization header returns 200, returned array includes the just-
  published listing.
- Full lifecycle walk: create → update → get → publish → list, asserting
  state transitions and ownership invariants.

## Test Commands

    bun run typecheck   # clean
    bun run lint        # clean
    bun test lib/server/__tests__/listings-lifecycle-integration.test.ts
    # → 3 pass, 0 fail, 40 expect() calls
