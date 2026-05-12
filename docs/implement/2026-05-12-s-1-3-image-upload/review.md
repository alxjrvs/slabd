---
run_id: 2026-05-12-s-1-3-image-upload
phase: phase_4_final_review
schema_version: 1
status: complete
base_sha: 906720cb304fcfa90a177ef6c595fd7b3c757605
remediation_sha: 81f2071
final_sha: 81f2071
re_review_count: 1
verdict: APPROVED
---

# Final review — Phase 4

## Panel

Pass 1 (concurrent dispatch on `906720c`):

| Reviewer | Verdict |
|----------|---------|
| `code-reviewer` | APPROVED-WITH-NOTES |
| `pr-test-analyzer` | SUFFICIENT-WITH-NOTES |
| `silent-failure-hunter` | CHANGES-REQUIRED |

## Corroborated findings (pass 1)

Cross-reviewer corroboration produced four real items:

1. **AC-1 size cap unenforceable as specified** (code-reviewer + test-analyzer).
   AC-1 claimed 10 MB enforcement via `x-amz-content-length-range`, but that
   condition is POST-policy-only and cannot be bound to a SigV4 query-presigned
   PUT URL. Confirm-time HEAD on R2 is technically feasible but bypassable by
   retrying confirm with a different key; pragmatically the cap is a client-
   side concern owned by the mobile picker story (out of scope here).

2. **Env coalesce → broken URLs silently** (silent-failure-hunter, high
   severity). `CF_ACCOUNT_ID`, `CF_R2_BUCKET`, `CF_R2_ACCESS_KEY_ID`,
   `CF_R2_SECRET_ACCESS_KEY` (upload-url) and `CF_IMAGES_ACCOUNT_HASH` (list)
   defaulted to `""` when missing, producing malformed presigned URLs and
   `imagedelivery.net//<key>/<variant>` variant URLs that surface only as
   downstream 404s / opaque SigV4 errors.

3. **JSON parse failures swallowed** (silent-failure-hunter). `c.req.json()`
   `catch {}` discarded the error in both upload-url and confirm. Operators
   had no signal when clients sent malformed bodies.

4. **Partial-swap log message misleading** (silent-failure-hunter). The
   confirm handler ran demote-then-insert under one `try`; if the demote
   succeeded and the insert threw, the listing was left with zero primary
   images, and the catch block emitted `"failed to insert image"` — no
   indication that the listing was in an inconsistent state.

Sub-threshold items not actioned (documented as accepted in pass 2):

- `c.var.userId` defensive asymmetry between upload-url (401 branch) and
  confirm (trusts `AppVars` contract). Defensive check costs nothing at
  runtime, test exists; asymmetry kept.
- Test-analyzer's 403 ownership-gate gap is unactionable until S-2.4 lands
  (`ownsListing()` is a stub returning `true` with a `TODO(S-2.4)` marker).
- Test-analyzer's `created_at` tiebreak coverage gap is implementation-detail
  only; intent AC-4 does not mandate the tiebreak.

## Remediation (commit `81f2071`)

- `lib/server/routes/listings-images-upload-url.ts`: added R2 env-guard (500 +
  structured log naming missing variables) before any signing; replaced
  `catch {}` on `c.req.json()` with `logger.warn(...)` + `serializeError`.
- `lib/server/routes/listings-images-confirm.ts`: split the demote/insert into
  two try blocks with a `demoteCompleted` sentinel — post-demote insert
  failures now log "may have left listing without primary — manual remediation
  may be required"; JSON parse `logger.warn(...)`; added 400
  `invalid_listing_id` guard for empty path params.
- `lib/server/routes/listings-images-list.ts`: 500 + logged error when
  `CF_IMAGES_ACCOUNT_HASH` is empty.
- `docs/implement/2026-05-12-s-1-3-image-upload/intent.md`: AC-1 amended to
  honestly drop the `x-amz-content-length-range` claim; deferral rationale
  inline.
- Tests added: env-guard misses for upload-url (parameterized over all four
  required vars), env-guard miss for list, invalid-JSON body for confirm,
  partial-demote-then-insert-failure for confirm.

Gate after remediation: 36 suites / 226 tests (+7), typecheck clean,
lint clean.

## Pass 2 (minimal corroboration panel on `81f2071`)

| Reviewer | Verdict |
|----------|---------|
| `silent-failure-hunter` | CLEAN |
| `code-reviewer` | APPROVED |

Pass-2 reviewers verified the remediation against the pass-1 findings on a
per-file basis. No new findings. `re_review_count: 1` (within the
phase-4 cap of 2).

## AC coverage at ship

- AC-1: signed upload URL — Clerk-gated, ownership-stub, content-type pinned
  to allowlist, TTL 300 s, 8-image cap, R2 env-guard. Size cap deferred to
  client story per amended AC.
- AC-2: confirm + atomic primary swap — split try blocks with partial-failure
  observability, first-image auto-primary, 8-image cap, invalid-body and
  empty-listingId guards.
- AC-3: EXIF strip via Cloudflare Images variants — no server-side EXIF code;
  R2 URL leak guard test scans response body.
- AC-4: ordered list — primary DESC, position ASC, createdAt ASC tiebreak.
- AC-5: end-to-end walk — `createApp({...})` exercises all three handlers
  through the test fixture; auth gates and DI wiring verified.

## Verdict

**APPROVED** — proceed to Phase 5 ship.
