---
cycle: cycle-1
run_id: 2026-05-11-s-1-7-ci-parity
status: complete
acs_covered: [AC-1, AC-2, AC-3, AC-4, AC-5]
files_changed:
  - .github/workflows/ci.yml
  - eslint.config.mjs
  - eas.json
  - .detoxrc.js
  - e2e/detox/jest.config.js
  - e2e/detox/setup.js
  - e2e/detox/smoke.test.js
  - docs/ci.md
verifiable_evidence:
  tests_passing: true
  test_command_used: "bun run typecheck && bun run lint && bun run test:ci"
  unit_suites: 16
  unit_tests: 83
proposed_ontology_terms:
  - parity gate
  - skipped-with-warning
  - preview channel
  - EAS managed credentials
  - Detox smoke spec
---

# Cycle 1 — CI parity gate

## What this cycle delivers

Extends `.github/workflows/ci.yml` from {unit, e2e} to {unit, e2e,
ios-smoke, android-smoke, web-preview}, all gated by a uniform
`check-<secret>` outputs pattern that emits `::warning::` + skips
when secrets are absent.

## AC mapping

| AC | Where | How verified |
|----|-------|--------------|
| AC-1 | `.github/workflows/ci.yml` `unit` + `e2e` jobs untouched | `git diff` shows no changes within the original 67 lines; both jobs still required-for-merge per branch protection |
| AC-2 | `ios-smoke` job + `eas.json` `dev-sim` profile + `.detoxrc.js` `ios.sim.debug` + `e2e/detox/smoke.test.js` | Gated on `check-eas-secret.outputs.have_expo_token == 'true'`; macos-15 runner; 45m timeout; uploads `detox-ios-artifacts` on failure |
| AC-3 | `android-smoke` job + `eas.json` `dev-emulator` profile + `.detoxrc.js` `android.emu.debug` | Same gate; uses `reactivecircus/android-emulator-runner@v2` with api-level 34, profile pixel_6; KVM enabled; uploads `detox-android-artifacts` on failure |
| AC-4 | `web-preview` job + `check-cloudflare-secret` | Uses `cloudflare/wrangler-action@v3` `pages deploy dist --project-name=slabd-web --branch=${{ github.head_ref }}`; sticky comment via `marocchino/sticky-pull-request-comment@v2` with header `web-preview`; gated on PR event + both Cloudflare secrets present |
| AC-5 | `docs/ci.md` + every new `check-<secret>` job follows the exact shape | `docs/ci.md` documents the convention with code skeleton; new secret-gating jobs mirror the existing `check-e2e-secret` shape (outputs + `::warning::` + dependent-job `if:` on `needs.X.outputs.Y`) |

## Note on test evidence

This cycle is CI infrastructure — the "tests" are the workflow jobs
themselves, exercised by GitHub Actions on push. The standard
`ac_test_evidence` envelope field (unit-test fragment per AC) doesn't
apply cleanly here. Verification of the new jobs requires the secrets
to be provisioned on the repo; until then the jobs run the
`skipped-with-warning` path, which is itself the AC's success
behavior in the secrets-absent state.

The existing unit + e2e suite remains green: 16 suites, 83 tests
pass; typecheck and lint both clean (see `verifiable_evidence`
above).

## Notable decisions

- **`.js` over `.ts` for the Detox spec** — avoids pulling `@types/detox` and `@types/jest` into local `devDependencies` purely to support a CI-only file. The main jest `testMatch` is `.ts|.tsx`, so the spec is excluded from the unit suite automatically. An eslint flat-config block scopes jest globals (describe/it/beforeAll/etc.) to `e2e/detox/**/*.js` only.
- **Detox + eas-cli installed globally inside CI only** — `bun add -g eas-cli detox-cli` in the smoke jobs; kept out of `package.json` so local installs aren't pulling ~80 MB of native tooling no one will run.
- **macos-15 runner for iOS** — required by EAS local builds (Xcode). Accepted ~10× cost per AC-2 parity intent; flagged in `docs/ci.md` cost notes for future re-evaluation.
- **Sticky PR comment** — `marocchino/sticky-pull-request-comment@v2` with `header: web-preview` so each new PR push updates the same comment rather than spamming a new one per push.
- **Smoke spec is intentionally minimal** — waits for an RCTView to render within 30s; not yet asserting on sign-up testIDs because the buyer sign-up screens don't have stable testID hooks yet. Follow-up issue #31 (filed during planning of this run) tracks adding those hooks once EAS secrets land and the spec author can iterate locally.

## Out of scope (deferred)

- Wiring the actual `EXPO_TOKEN`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID` repo secrets — this is a repo-admin action,
  not a code change. The infra is ready; provisioning is a separate
  one-off step documented in `docs/ci.md`.
- Refining the Detox spec to assert on a stable sign-up testID
  (follow-up #31).
- Branch protection configuration (also a repo-admin action;
  `docs/ci.md` documents the required check names).
