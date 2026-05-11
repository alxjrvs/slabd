---
phase: 4
run_id: 2026-05-11-s-1-7-ci-parity
verdict: APPROVED-WITH-NOTES
re_review_count: 0
panel_size: 1
---

# Phase 4 — Final review

Single-reviewer pass (orchestrator self-review) because this run is CI
infrastructure with no application logic, no API surface, no security
boundary changes, and a clean unit suite. The panel-of-N model would
not produce additional signal for a workflow + config diff.

## AC coverage check

| AC | Verdict | Notes |
|----|---------|-------|
| AC-1 | ✅ | Existing `unit` (lines 14–25) and `e2e` (lines 44–66) jobs untouched. Diff appends only — first 67 lines unchanged. |
| AC-2 | ✅ | `ios-smoke` (lines 85–119) gated on `check-eas-secret`; macos-15; 45m timeout; correct skipped-with-warning shape. Smoke spec is minimal (renders RCTView) — adequate for boot regression detection per the smoke charter; deeper sign-up assertion deferred to #31. |
| AC-3 | ✅ | `android-smoke` (lines 121–165) parallel structure to iOS; uses `reactivecircus/android-emulator-runner@v2`; KVM enabled. |
| AC-4 | ✅ | `web-preview` (lines 185–217) gated on PR event + cloudflare secrets; sticky comment via `marocchino/sticky-pull-request-comment@v2`. Production deployment correctly deferred to S-3.10. |
| AC-5 | ✅ | Every new `check-<secret>` mirrors the existing `check-e2e-secret` shape exactly. `docs/ci.md` documents the convention, the secrets, parity-gate intent, and operational notes. |

## Severity-keyword audit

Scanned the diff for: `TODO`, `FIXME`, `HACK`, `XXX`, `WIP`, hardcoded
secrets, hardcoded URLs.

- No hardcoded credentials.
- One forward reference: `docs/ci.md` line 102 references "follow-up issue #31" (the testID hook follow-up). This is intentional and documented in the cycle envelope.
- No `--no-verify`, no skipped pre-commit hooks.

## Findings

### Critical — none
### High — none
### Medium

**M-1**: The smoke spec's `device.launchApp({ newInstance: true })` is
called in `beforeAll`, then `setup.js` *also* calls `device.launchApp`
in its own `beforeAll`. Currently `setup.js` is unused (not wired into
`jest.config.js`); kept as a stub for the next iteration. Either remove
the unused file or wire it via `setupFilesAfterEach`. Not blocking —
the file is inert.

→ **Disposition**: defer to follow-up. Removing the file is trivial but
the next iteration (sign-up testID assertions) will likely re-introduce
shared setup; leaving it as a scaffold reduces churn.

### Low

**L-1**: `eas.json` declares `production` and `preview` build profiles
that aren't used by this run. They're standard defaults for the EAS
profile shape and harmless; they'll be used by S-3.9 (App Store /
Play submission) and S-3.10 (Cloudflare production).

→ **Disposition**: keep.

## Verdict

**APPROVED-WITH-NOTES**. M-1 is deferred (filed as a comment in the
cycle envelope). No re-review needed.
