---
run_id: 2026-05-12-s-1-3-image-upload
cycle: cycle-4
phase: phase_2_cycles
schema_version: 1
status: complete
sha: 05d01c1f52403f165c9389caa5b3637624be46f8
parent_sha: bb30b8022fcaab0657f8617a33c38d36e85417d4
worktree: .claude/worktrees/agent-a49be75a126bc9803
branch: cycle-4/listings-images-list
---

# Cycle 4 — Public list with CF variant URLs (AC-3 + AC-4)

## Goal

`GET /api/listings/:id/images` (public, no Clerk gate) returning images sorted primary-first then by position, each with a `variants: { card, thumb, detail }` object built from `CF_IMAGES_ACCOUNT_HASH`. R2 URLs MUST NOT leak — EXIF strip delegated entirely to CF Images variant pipeline.

## Files changed

- `lib/server/images/variant-url.ts` (new — pure `buildVariantUrl` / `buildVariants`)
- `lib/server/routes/listings-images-list.ts` (new — handler factory)
- `lib/server/__tests__/listings-images-list.test.ts` (new — 5+ assertions, including R2 URL leak guard)

## TDD

- **RED**: test file written first asserting `buildVariants` shape, 200 list happy path, primary-first ordering, position ordering, no-r2-url-leak guard, 500 on db throw. Run fails with module-not-found.
- **GREEN**: `variant-url.ts` + route handler implemented; all assertions pass.
- **REFACTOR**: naming, comments, imports.

## Test evidence

Worker ran `bun run typecheck && bun run lint && bun run test:ci` (with `bun test` fallback inside worktree due to jest config exclusion) and reported green.
After integration into `run/2026-05-12-s-1-3-image-upload`, the same gate ran on the merged branch reproduces green (35 suites / 218 tests).

## AC coverage

- AC-3: variants object built from `CF_IMAGES_ACCOUNT_HASH`, R2 URLs do not leak in any response field.
- AC-4: ordered list (primary first, then position ASC, then created_at ASC tiebreaker).

## Notes

- `variant-url.ts` is a pure module (no env access). `accountHash` injected by the route handler from `deps.env.CF_IMAGES_ACCOUNT_HASH`.
- Three variants registered: `card`, `thumb`, `detail`. Variant names must match those configured in the Cloudflare Images dashboard.
- Cycle-5 will wire the route into `app.ts` and add the end-to-end integration test.

## Envelope

Verified by orchestrator: SHA `05d01c1` reachable on `cycle-4/listings-images-list`; `git diff --name-only bb30b80..05d01c1` matches `files_changed_claimed`; full gate green on the integrated run branch.
