---
run_id: 2026-05-12-s-1-3-image-upload
cycle: cycle-1
phase: phase_2_cycles
schema_version: 1
status: complete
sha: 5a1ce446359e63accdc1d8788771e6a735090157
parent_sha: 53433a76
---

# Cycle 1 — Foundation

## Goal

Land the `listingImages` Drizzle schema + migration SQL + 5 new CF env vars in `.env.example` / `wrangler.toml` / CI soft-warn step. No route handlers, no R2 client, no variant URL builder.

## Files changed

- `lib/db/schema.ts` (modified — append `listingImages` table)
- `lib/db/__tests__/schema.test.ts` (modified — 6 column assertions)
- `drizzle/0002_images.sql` (new — hand-authored migration mirroring 0001 format)
- `.env.example` (modified — CF block added)
- `wrangler.toml` (modified — secret-put comments for 5 new vars)
- `.github/workflows/ci.yml` (modified — `check-r2-config` soft-warn job)

## TDD

- **RED**: Added 6 column assertions for `listingImages` to `schema.test.ts`. Run failed: `listingImages` not exported from `~/db/schema`.
- **GREEN**: Added the `pgTable("images", { ... })` block to `lib/db/schema.ts` (with `integer` added to the imports). All 16 tests passed.
- **REFACTOR**: No structural change; verified import order and column alignment.

## Test evidence

```
bun test lib/db/__tests__/schema.test.ts
16 pass / 0 fail / 37 expect() calls
```

Full gate (`bun run typecheck && bun run lint && bun run test:ci`) green.

## AC coverage (partial)

- AC-5: schema + env + CI soft-warn registered. Final AC-5 close-out (tests for all 3 endpoints + integration) lands in cycle-5.

## Notes

- Drizzle migration is hand-authored, not `drizzle-kit generate`-d. This mirrors `0001_stripe_webhook_events.sql` which was also hand-authored. `drizzle/meta/` was not touched — review at integration time if `drizzle-kit` needs reconciliation.
- `listings(id)` FK omitted (table doesn't exist; lands in S-2.4). SQL has a comment marker.

## Envelope

Verified by orchestrator: SHA `5a1ce44` reachable on `run/2026-05-12-s-1-3-image-upload`; `git diff --name-only` matches `files_changed_claimed`; `bun test lib/db/__tests__/schema.test.ts` reproduces 16/16 green.
