# Ship — S-1.5 observability baseline

**Status:** shipped
**PR:** [#42](https://github.com/alxjrvs/slabd/pull/42)
**Base:** main
**Head:** `run/2026-05-11-s-1-5-observability-baseline`

## Commits

- `c1dacd0` cycle-1 — logger surface + no-console lint guardrail (AC-1, AC-2)
- `fc49da3` cycle-2 — Sentry SDK + release tagging + breadcrumb sink (AC-3, AC-4)
- `632c078` cycle-3 — PostHog product-analytics surface (AC-5)
- `6bafe35` cycle-4 — Phase 4 remediation: Sentry release format + deferred init
- `00655a0` chore — run-folder docs (integration, review, ontology)

## Issues closed

- #5  — S-1.5 observability baseline (tracking issue)
- #38 — TODO in `lib/token-cache.ts`: replace console sites with structured logger

## Hand-off notes

- EAS Build env (`EAS_BUILD_COMMIT_SHA`, `EAS_BUILD_RUNTIME_VERSION`) drives
  Sentry release tagging. Sourcemap upload via `@sentry/react-native/expo`
  plugin is enabled in `eas.json` production profile (`SENTRY_UPLOAD_SOURCEMAPS=1`).
- PostHog and Sentry are both no-ops until their respective
  `EXPO_PUBLIC_*` keys are populated; see `.env.example`.
- Next M1 stories per architecture order: S-1.2 (#3 Stripe Connect),
  S-1.3 (#4 image upload), S-1.4 (#6 GCD catalog).
