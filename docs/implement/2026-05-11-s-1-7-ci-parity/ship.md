---
phase: 5
run_id: 2026-05-11-s-1-7-ci-parity
status: shipped
pr: 39
issue: 2
commits:
  - 1674d45 chore(implement): sync buyer-signup-profile run status to shipped
  - 7bd09a6 feat(ci): add iOS + Android Detox smoke + Cloudflare Pages preview (S-1.7)
---

# Phase 5 — Ship

## PR

[#39 — feat(ci): cross-platform parity gate — iOS+Android Detox + Cloudflare preview (S-1.7)](https://github.com/alxjrvs/slabd/pull/39)

## Issue

Closes #2 (S-1.7 CI pipeline + cross-platform parity gate).

## Post-merge actions (repo-admin, not code)

These cannot be performed by this run; they're documented in
`docs/ci.md`:

1. **Provision secrets** in Settings → Secrets and variables → Actions:
   - `EXPO_TOKEN` — generated via `eas account:create-token`
   - `CLOUDFLARE_API_TOKEN` — scoped Cloudflare token with **Pages: Edit**
   - `CLOUDFLARE_ACCOUNT_ID` — owns the `slabd-web` Pages project
   - (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is already set — preserves the
     existing e2e job.)
2. **Branch protection on `main`**: require status checks for `unit`,
   `e2e`, `ios-smoke`, `android-smoke`, `web-preview`.
3. **Create Cloudflare Pages project `slabd-web`** (if not already
   present) so the `web-preview` deploy step has a target.

## Follow-up

- #31 — refine Detox smoke spec to assert on stable sign-up testID once
  EAS secrets land and the spec author can iterate locally.

## Ontology

Terms accreted into `ontology-updates.md`:

- parity gate
- skipped-with-warning
- preview channel
- EAS managed credentials
- Detox smoke spec
