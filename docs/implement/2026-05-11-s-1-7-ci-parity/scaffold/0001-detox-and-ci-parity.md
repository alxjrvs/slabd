# ADR-0001: Detox for native parity, Cloudflare Pages for web preview, secret-gated jobs

- **Status:** Accepted
- **Date:** 2026-05-11
- **Run:** 2026-05-11-s-1-7-ci-parity
- **Issue:** alxjrvs/slabd#2 (S-1.7)
- **Supersedes:** none

## Context

Story S-1.7 (REQ-027) requires every PR to run a cross-platform parity gate
covering iOS, Android, and web. Web e2e (Playwright + axe-core) already
runs via the existing `e2e` job, gated by `check-e2e-secret`. We need:

1. Smoke coverage on iOS + Android so a regression on a native-only path
   (e.g. SecureStore behavior, Reanimated runtime, gesture-handler) is
   caught before merge.
2. A web preview URL surfaced on every PR so stakeholders can poke the UI
   without checking out the branch.
3. A gating discipline that keeps the workflow useful in this repo today
   (before EAS and Cloudflare secrets exist) and in forks (where secrets
   are never injected).

## Decision

**Native smoke.** Use [Detox](https://wix.github.io/Detox/) with EAS Build
(`eas build --platform <ios|android> --profile <dev-sim|dev-emulator>
--local`) producing simulator-friendly binaries. Detox runs in a separate
jest config (`e2e/detox/jest.config.js`) so it doesn't collide with the
main unit suite. Smoke specs live under `e2e/detox/`.

**Web preview.** Deploy each PR's `expo export --platform web` output to
[Cloudflare Pages](https://developers.cloudflare.com/pages) via the
official `cloudflare/wrangler-action@v3`. Use
`marocchino/sticky-pull-request-comment@v2` to post one updatable preview
URL comment per PR (no duplicate spam on push).

**Gating.** Every new job follows the `check-<secret>` outputs-gating
pattern already used by `check-e2e-secret`:

```yaml
check-X-secret:
  outputs: { have_X: ${{ steps.check.outputs.have_X }} }
  steps:
    - id: check
      env: { S: ${{ secrets.S }} }
      run: |
        if [ -n "$S" ]; then echo "have_X=true" >> "$GITHUB_OUTPUT"
        else echo "have_X=false" >> "$GITHUB_OUTPUT"
        echo "::warning::S secret not set; <job> will be skipped"
        fi

dependent-job:
  needs: [unit, check-X-secret]
  if: needs.check-X-secret.outputs.have_X == 'true'
```

This keeps absent-secret runs **green-with-warning** (not red) while
making the absence visible in the workflow log.

**Local-install footprint.** Detox and `eas-cli` are NOT added to the
repo's `devDependencies` — they're installed globally inside the CI job
only (`bun add -g eas-cli detox-cli`). This keeps `bun install` fast for
local development and avoids requiring contributors to have Xcode + EAS
accounts to run `bun install`.

## Alternatives considered

1. **Appium instead of Detox** — Appium is more language-agnostic but
   slower, less idiomatic for React Native, and has more flake in our
   target stack. Detox is the de-facto RN choice and is maintained by
   Wix. Rejected.

2. **Vercel previews instead of Cloudflare Pages** — Vercel works, but
   the Slabd architecture (ADR not yet authored) leans toward Cloudflare
   for the production web channel (S-3.10). Co-locating preview and
   production cuts vendor surface area. Accepted Cloudflare.

3. **Mark the native jobs as `if: false` until secrets land** — would
   mean the job is invisible in the workflow run rather than visibly
   skipped-with-warning. Rejected: contributors learn nothing about
   why parity coverage is absent, and there's no nudge to wire the
   secret.

4. **Run Detox without EAS, using `expo prebuild` + native build in CI** —
   doable but adds 15–25 minutes per platform per PR and locks the CI
   runner into Xcode/Android SDK version drift. EAS Build handles
   credentials and version drift centrally. Accepted EAS.

5. **Add Detox + EAS CLI to local `devDependencies`** — would force
   every contributor's `bun install` to pull ~200 MB of native build
   tooling. Rejected: install only in CI.

## Consequences

- **Positive:**
  - Per-PR feedback on iOS + Android regressions (REQ-027 satisfied
    once EAS secrets land).
  - Stakeholders get a click-through preview URL on every PR.
  - The same gating pattern means future jobs (e.g. backend integration
    smoke after S-1.5) plug in identically.
  - Workflow remains green-with-warning in forks and pre-secret state,
    so it's not blocking developer iteration today.

- **Negative:**
  - Detox specs need active maintenance — RN upgrades and Expo SDK
    bumps can break native build paths. We accept that maintenance cost
    in exchange for cross-platform parity.
  - `eas build --local` requires Xcode on the macOS runner; macos runners
    are ~10× more expensive than ubuntu runners. We accept a per-PR
    cost increase as the price of native parity. Skipped-with-warning
    means we pay nothing until the secret is wired.

- **Neutral:**
  - Smoke spec is currently a launch-renders-something assertion. It'll
    be refined to assert sign-up entry once the secret is wired and the
    spec author can validate locally.

## Open questions (deferred follow-ups)

- Production EAS submission profiles (S-3.9, not this run).
- Cloudflare Pages production project + custom domain (S-3.10).
- Adding a `parity-summary` rollup job that fails when iOS/Android jobs
  diverge — deferred until we see real flake patterns.
