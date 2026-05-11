---
run_id: 2026-05-11-s-1-7-ci-parity
intent: >-
  Extend the existing CI workflow so every PR runs the full per-platform check
  set — lint, typecheck, unit/integration tests, web e2e with axe-core, iOS
  Detox smoke (via EAS), Android Detox smoke (via EAS) — and publishes a
  Cloudflare Pages web preview, with all new jobs following the existing
  secret-gating pattern (graceful skipped-with-warning when credentials are
  absent) so the workflow remains useful in forks and on this repo before
  EAS / Cloudflare secrets are provisioned.
acceptance_criteria:
  - id: AC-1
    text: >-
      Every PR triggers the existing unit job (lint + typecheck + unit tests)
      AND the e2e-web job (Playwright + axe-core AA gate). Both jobs are
      preserved (not duplicated) and remain required-for-merge.
  - id: AC-2
    text: >-
      A new iOS Detox smoke job runs per PR. It builds the app via EAS Build
      (managed credentials) and executes a happy-path smoke spec covering the
      buyer sign-up flow. When EAS / Apple secrets are absent the job emits a
      ::warning:: and skips with success=skipped (not red). When configured,
      pass is required for merge.
  - id: AC-3
    text: >-
      A new Android Detox smoke job runs per PR with the same EAS-driven build
      + happy-path spec on an Android emulator. Same skipped-with-warning
      semantics when secrets are absent.
  - id: AC-4
    text: >-
      A web-preview job builds the Expo web bundle and publishes it to a
      Cloudflare Pages preview channel, posting a sticky PR comment with the
      preview URL. Skipped-with-warning when CLOUDFLARE_API_TOKEN /
      CLOUDFLARE_ACCOUNT_ID are absent.
  - id: AC-5
    text: >-
      All new jobs follow the existing check-<secret> outputs-gating pattern
      already used by check-e2e-secret; a single contributors-facing doc
      (docs/ci.md) describes the required GitHub Actions secrets, the
      skipped-with-warning semantics, and the cross-platform parity-gate
      intent so future contributors don't break the convention.
out_of_scope:
  - App Store / Play Store submission (S-3.9)
  - Cloudflare Pages production / custom-domain deploy (S-3.10)
  - Production EAS Submit and release credentials (S-3.9 / S-3.10)
  - Backup / restore / SLO dashboards (S-3.8)
  - Security validation suite (S-3.7)
  - Adding new product features; this run only covers the gate
proposed_ontology_terms:
  - parity gate
  - skipped-with-warning
  - preview channel
  - EAS managed credentials
  - Detox smoke spec
source:
  kind: issue
  ref: "alxjrvs/slabd#2"
---

# Intent — S-1.7 CI pipeline + cross-platform parity gate

## Intent

Extend the existing CI workflow so every PR runs the full per-platform check
set — lint, typecheck, unit/integration tests, web e2e with axe-core, iOS
Detox smoke (via EAS), Android Detox smoke (via EAS) — and publishes a
Cloudflare Pages web preview, with all new jobs following the existing
secret-gating pattern (graceful skipped-with-warning when credentials are
absent) so the workflow remains useful in forks and on this repo before
EAS / Cloudflare secrets are provisioned.

## Acceptance Criteria

- **AC-1**: Every PR triggers the existing unit job (lint + typecheck + unit
  tests) AND the e2e-web job (Playwright + axe-core AA gate). Both jobs are
  preserved (not duplicated) and remain required-for-merge.
- **AC-2**: A new iOS Detox smoke job runs per PR. It builds the app via
  EAS Build (managed credentials) and executes a happy-path smoke spec
  covering the buyer sign-up flow. When EAS / Apple secrets are absent the
  job emits a `::warning::` and skips with `success=skipped` (not red).
  When configured, pass is required for merge.
- **AC-3**: A new Android Detox smoke job runs per PR with the same
  EAS-driven build + happy-path spec on an Android emulator. Same
  skipped-with-warning semantics when secrets are absent.
- **AC-4**: A web-preview job builds the Expo web bundle and publishes it
  to a Cloudflare Pages preview channel, posting a sticky PR comment with
  the preview URL. Skipped-with-warning when `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` are absent.
- **AC-5**: All new jobs follow the existing `check-<secret>`
  outputs-gating pattern already used by `check-e2e-secret`; a single
  contributors-facing doc (`docs/ci.md`) describes the required GitHub
  Actions secrets, the skipped-with-warning semantics, and the
  cross-platform parity-gate intent so future contributors don't break
  the convention.

## Out of Scope

- App Store / Play Store submission (S-3.9)
- Cloudflare Pages production / custom-domain deploy (S-3.10)
- Production EAS Submit and release credentials (S-3.9 / S-3.10)
- Backup / restore / SLO dashboards (S-3.8)
- Security validation suite (S-3.7)
- Adding new product features; this run only covers the gate

## REQ-IDs

REQ-012 (CI runs all checks per PR), REQ-027 (cross-platform parity).

## Source

GitHub issue [alxjrvs/slabd#2](https://github.com/alxjrvs/slabd/issues/2)
(body SHA: `013db6a786b184f3f17de6a90214acb7e1a89163`).

<!-- implement:run_id=2026-05-11-s-1-7-ci-parity -->
