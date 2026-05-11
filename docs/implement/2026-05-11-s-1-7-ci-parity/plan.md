---
run_id: 2026-05-11-s-1-7-ci-parity
planned_cycles: 1
aggregate_budget: 12
ac_coverage:
  AC-1: implicit-preserved
  AC-2: cycle-1
  AC-3: cycle-1
  AC-4: cycle-1
  AC-5: cycle-1
dep_graph:
  cycle-1: []
cycles:
  - id: cycle-1
    title: Detox iOS+Android smoke jobs, Cloudflare Pages preview, parity-gate docs
    acs_covered: [AC-2, AC-3, AC-4, AC-5]
    estimated_complexity: medium
    dependencies: []
    file_paths:
      - .github/workflows/ci.yml
      - eas.json
      - .detoxrc.js
      - e2e/detox/jest.config.js
      - e2e/detox/setup.js
      - e2e/detox/smoke.test.js
      - jest.config.js
      - docs/ci.md
    reads_from:
      - .github/workflows/ci.yml
      - package.json
      - app/(auth)/sign-in.tsx
---

# Plan — S-1.7 CI pipeline + cross-platform parity gate

## Cycle decomposition

Single cycle. The work is a tightly-coupled CI extension that touches one
workflow file and a handful of supporting config/spec files. Splitting into
multiple cycles would force a merge dance on `.github/workflows/ci.yml`
without buying any verification independence.

### cycle-1 — Detox iOS+Android smoke jobs, Cloudflare Pages preview, parity-gate docs

**Covers:** AC-2, AC-3, AC-4, AC-5.

**Approach:**

1. Extend `.github/workflows/ci.yml` with five additions, all following the
   existing `check-<secret>` outputs-gating pattern from `check-e2e-secret`:
   - `check-eas-secret` job (outputs `have_expo_token`).
   - `ios-smoke` job (gated on `have_expo_token == 'true'`).
   - `android-smoke` job (gated on `have_expo_token == 'true'`).
   - `check-cloudflare-secret` job (outputs `have_cloudflare`).
   - `web-preview` job (gated on `have_cloudflare == 'true'` AND pull_request event).

2. Add the Detox scaffolding so the smoke jobs are runnable once secrets
   are wired:
   - `eas.json` with `dev-sim` (iOS simulator) and `dev-emulator` (Android
     APK) build profiles.
   - `.detoxrc.js` with iOS + Android device configurations pointing at the
     EAS build outputs.
   - `e2e/detox/jest.config.js` — Detox-specific jest config (separate from
     the main suite).
   - `e2e/detox/setup.js`, `e2e/detox/smoke.test.js` — minimal launch-and-
     render-something smoke spec.
   - Update `jest.config.js` `testPathIgnorePatterns` to exclude `/e2e/`
     so the main unit run doesn't try to execute Detox specs.

3. Add `docs/ci.md` documenting:
   - Each job, what it gates on, and what secret it needs.
   - The `skipped-with-warning` semantics and how to read the workflow run
     when a secret is missing.
   - The parity-gate intent (REQ-027) and how it composes with branch
     protection.

**AC-1 (preservation):** the existing `unit` + `check-e2e-secret` + `e2e`
jobs are kept verbatim. Phase 3 integration-check verifies the diff doesn't
remove them.

**File-path disjointness:** trivially satisfied (one cycle).
