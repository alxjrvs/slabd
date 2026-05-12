---
run_id: 2026-05-12-s-1-3-image-upload
cycle: cycle-2
phase: phase_2_cycles
schema_version: 1
status: complete
sha: 940e75375ab0cb7b0919cecb853b37ba3d8e42b8
parent_sha: bb30b8022fcaab0657f8617a33c38d36e85417d4
worktree: .claude/worktrees/agent-a0789489009706dbf
branch: cycle-2/listings-images-upload-url
---

# Cycle 2 — Signed-URL issuance (AC-1)

## Goal

`POST /api/listings/:id/images/upload-url` returning `{ uploadUrl, key, expiresAt }` with a 300s TTL, content-type pinned, ownership-gated, and 8-image cap enforced.

## Files changed

- `lib/server/r2/presign.ts` (new — `presignR2Put` using `aws4fetch` SigV4)
- `lib/server/routes/listings-images-upload-url.ts` (new — handler factory)
- `lib/server/__tests__/listings-images-upload-url.test.ts` (new — 5+ assertions)
- `package.json` (modified — `aws4fetch` dep added)
- bun lockfile (modified — lockfile sync)

## TDD

- **RED**: test file written first asserting 200 happy path, 400 image_limit_exceeded, 400 unsupported_content_type, 401 unauthorised, 500 internal_error. Run fails with module-not-found.
- **GREEN**: `presign.ts` + route handler implemented; all assertions pass.
- **REFACTOR**: import order, naming, comment tightening.

## Test evidence

Worker ran `bun run typecheck && bun run lint && bun run test:ci` and reported green.
After integration into `run/2026-05-12-s-1-3-image-upload`, the same gate ran on the merged branch reproduces green (35 suites / 218 tests).

## AC coverage

- AC-1: signed upload URL endpoint, content-type pinned, ≤5 min TTL, 8-image cap.

## Notes

- Ownership gate stubbed via local `ownsListing()` returning `true` with a `// TODO(S-2.4)` marker pending the `listings` table.
- 10MB hard cap NOT enforceable on a query-presigned PUT (SigV4 limitation: `x-amz-content-length-range` is POST-policy only). Deferred to confirm endpoint (cycle-3 in spirit, AC-5 in cycle-5 integration tests).
- `aws4fetch` chosen for Workers compatibility (no Node crypto requirement).

## Envelope

Verified by orchestrator: SHA `940e753` reachable on `cycle-2/listings-images-upload-url`; `git diff --name-only bb30b80..940e753` matches `files_changed_claimed`; full gate green on the integrated run branch.
