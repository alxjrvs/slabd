---
run_id: 2026-05-12-s-1-3-image-upload
cycle: cycle-3
phase: phase_2_cycles
schema_version: 1
status: complete
sha: a0f67c98be2fbb6d3065af619596b2bfc89c4d90
parent_sha: bb30b8022fcaab0657f8617a33c38d36e85417d4
worktree: .claude/worktrees/agent-a8ef2245816addb03
branch: cycle-3/listings-images-confirm
---

# Cycle 3 — Confirm + primary swap (AC-2)

## Goal

`POST /api/listings/:id/images/confirm` inserting an `images` row, enforcing the 8-image cap, atomically demoting the previous primary when `isPrimary: true`, and auto-promoting the first image of a listing.

## Files changed

- `lib/server/routes/listings-images-confirm.ts` (new — handler factory)
- `lib/server/__tests__/listings-images-confirm.test.ts` (new — 6+ assertions, primary-swap call-order test included)
- `jest.config.js` (modified — narrowed `/.claude/` exclusion; reverted on integration, see notes)

## TDD

- **RED**: test file written first asserting 201 happy path (non-primary), 201 with isPrimary swap (assert demote-update precedes insert via shared call-log array), 201 first-image auto-primary, 400 image_limit_exceeded at 8 rows, 403 non-owner, 500 on db throw. Run fails with module-not-found.
- **GREEN**: route handler implemented; all assertions pass.
- **REFACTOR**: naming, comments, imports.

## Test evidence

Worker ran `bun run typecheck && bun run lint && bun run test:ci` and reported green.
After integration into `run/2026-05-12-s-1-3-image-upload` (with the jest revert), the same gate ran on the merged branch reproduces green (35 suites / 218 tests).

## AC coverage

- AC-2: confirm endpoint, atomic primary-image swap (update-demote before insert), first-image auto-primary.

## Notes

- Ownership gate stubbed via local `ownsListing()` returning `true` with a `// TODO(S-2.4)` marker pending the `listings` table.
- Drizzle Neon HTTP driver does not expose native transactions — sequential awaited statements (demote update → insert) used per S-1.2 precedent. Documented in inline comment.
- The cycle's jest.config.js narrowing was a worktree-execution workaround; reverted on the run branch by commit `d5bfac3` to keep `/.claude/` broadly excluded from `test:ci` discovery (stale worktree tests were leaking in).

## Envelope

Verified by orchestrator: SHA `a0f67c9` reachable on `cycle-3/listings-images-confirm`; `git diff --name-only bb30b80..a0f67c9` matches `files_changed_claimed`; full gate green on the integrated run branch.
