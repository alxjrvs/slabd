# Ontology proposals — 2026-05-11-s-1-7-ci-parity

## Proposed new terms

- **parity gate** — the per-PR check set that establishes equivalent quality
  signal across iOS / Android / web platforms; if any platform job is red
  (and its secrets are present), merge is blocked.
- **skipped-with-warning** — a CI job that exits with `success=skipped` (not
  red, not silently green) when its prerequisite secret is absent, while
  emitting a `::warning::` so the absence is visible in the workflow run.
  Follows the existing `check-e2e-secret` gating pattern.
- **preview channel** — a non-production Cloudflare Pages deployment created
  per PR for stakeholder review. Distinct from the production channel
  (S-3.10).
- **EAS managed credentials** — credentials stored in Expo Application
  Services (not in repo secrets directly) used by EAS Build for iOS/Android
  builds in CI.
- **Detox smoke spec** — an end-to-end test executed against a built native
  app binary on a CI runner, covering one happy path. Distinct from web e2e
  (Playwright) and unit/integration tests (Jest).
