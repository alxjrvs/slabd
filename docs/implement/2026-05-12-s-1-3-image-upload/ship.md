---
run_id: 2026-05-12-s-1-3-image-upload
phase: phase_5_ship
schema_version: 1
status: complete
---

# Phase 5 — Ship

## PR

- **URL**: https://github.com/alxjrvs/slabd/pull/49
- **Title**: `feat(images): backend upload pipeline — signed URLs, confirm, CF Images variants (closes #4)`
- **Base**: `main` (`be28c4c`)
- **Head**: `run/2026-05-12-s-1-3-image-upload` (`e1240af`)
- **Closes**: #4

## Final SHA chain

| Cycle | SHA | Subject |
|-------|-----|---------|
| 1 | `5a1ce44` | feat(images): foundation — schema + migration + R2/Images env |
| 2 | `940e753` | feat(images): signed-URL issuance endpoint (cycle-2) |
| 3 | `a0f67c9` | feat(images): confirm + atomic primary-image swap (cycle-3) |
| 4 | `05d01c1` | feat(images): public list endpoint with CF variant URLs (cycle-4) |
| integration | `d5bfac3` | fix(jest): restore broad .claude/ exclusion after cycle-3 merge |
| 5 | `62bce40` | feat(images): wire image routes + integration walk test (cycle-5) |
| remediation | `81f2071` | fix(images): post-review remediation — config guards, JSON parse logging, partial-swap observability |
| review record | `e1240af` | chore(implement): record phase-4 review + remediation |

## AC coverage

| AC | Verdict | Notes |
|----|---------|-------|
| AC-1 | shipped | 10 MB size cap deferred to mobile client story (amended) |
| AC-2 | shipped | partial-swap observability hardened post-review |
| AC-3 | shipped | R2 URL leak guard test in place |
| AC-4 | shipped | primary DESC, position ASC, createdAt ASC tiebreak |
| AC-5 | shipped | integration walk in place; env vars + migration shipped in cycle-1 |

## Test gate (final)

```
bun run typecheck   # clean
bun run lint        # clean
bun run test:ci     # 36 suites / 226 tests pass
```

## Issue comment sync

Posted summary to #4 via `gh issue comment 4` —
https://github.com/alxjrvs/slabd/issues/4#issuecomment-4427489923

## Known deferrals

- **Ownership gate**: `ownsListing()` is a stub returning `true` with a
  `TODO(S-2.4)` marker pending the `listings` table.
- **10 MB upload-size cap**: deferred to the mobile picker client story;
  SigV4 query-presigned PUT cannot bind `x-amz-content-length-range`.
- **Image deletion**, **CDN cache invalidation**, **per-listing storage
  quotas beyond count cap**, and **buyer-visible image rendering in browse**
  are all explicitly out of scope per `intent.md`.

## Next M1 step

S-1.4 (#6) — next deliver run on the M1 closeout track.
