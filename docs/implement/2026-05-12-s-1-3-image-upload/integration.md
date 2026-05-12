---
run_id: 2026-05-12-s-1-3-image-upload
phase: phase_3_integration
schema_version: 1
status: complete
base_sha: bb30b8022fcaab0657f8617a33c38d36e85417d4
final_sha: d5bfac31b6f530044255e54a841ae95d6d16f4fe
---

# Integration — Phase 3

## Inputs

| Cycle | Branch | SHA | Files |
|------:|--------|-----|-------|
| cycle-2 | `cycle-2/listings-images-upload-url` | `940e753` | 5 (presign, route, test, package.json, lockfile) |
| cycle-3 | `cycle-3/listings-images-confirm` | `a0f67c9` | 3 (route, test, jest.config.js) |
| cycle-4 | `cycle-4/listings-images-list` | `05d01c1` | 3 (variant-url, route, test) |

All three branches rooted at `bb30b8022fcaab0657f8617a33c38d36e85417d4` (cycle-1 seal).

## Merge sequence

Sequential `--no-ff` merges into `run/2026-05-12-s-1-3-image-upload`:

1. `git merge --no-ff cycle-2/listings-images-upload-url` → `2613aba`
2. `git merge --no-ff cycle-3/listings-images-confirm` → `3cccec5`
3. `git merge --no-ff cycle-4/listings-images-list` → `998ddb6`
4. `fix(jest): restore broad .claude/ exclusion after cycle-3 merge` → `d5bfac3`

No merge conflicts. Disjoint file scope (per plan.md §"Disjoint-write verification") held.

## Post-merge fixup

cycle-3 had narrowed the `jest.config.js` `testPathIgnorePatterns` from `/.claude/` to `/.claude/skills/` + `/.claude/settings` to allow worktree-internal test discovery during dispatch. On the run branch this leaked stale tests from old worktrees (`.claude/worktrees/agent-a0837ba1fc46d5965/lib/__tests__/...`) into the suite (2449 tests). Reverted to keep `/.claude/` broadly excluded. Post-fix: 218 tests across 35 suites — the actual project surface.

## Final gate

```
bun run typecheck   # clean
bun run lint        # clean
bun run test:ci     # 35 suites / 218 tests pass
```

## AC coverage so far

- AC-1: signed upload URL — cycle-2
- AC-2: confirm + primary swap — cycle-3
- AC-3: EXIF strip via CF Images variants — cycle-4 (delegation; no server-side EXIF code)
- AC-4: ordered list with variants — cycle-4
- AC-5: env + migration + tests — partial; cycle-5 will wire routes into `app.ts` and add the integration walk test (final AC-5 close-out).

## Next

Dispatch cycle-5 (integration cycle): wire all three handlers into `lib/server/app.ts` (extend `CreateAppOptions`) and add `lib/server/__tests__/listings-images-integration.test.ts` walking upload-url → confirm → list end-to-end against `createApp({ ... })`.
