# CI pipeline + cross-platform parity gate

`.github/workflows/ci.yml` runs on every PR (and every push to `main`).
It establishes the **parity gate** (REQ-027): equivalent quality signal
across iOS, Android, and web before any change merges.

This document is the contributor-facing reference for the jobs, the
secrets they need, and the "skipped-with-warning" convention.

## Jobs at a glance

| Job | Platform | Always runs? | Gated on |
|-----|----------|-------------|----------|
| `unit` | n/a | yes | — |
| `e2e` (Playwright + axe-core AA) | web | when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set | `check-e2e-secret` |
| `ios-smoke` (Detox via EAS) | iOS sim | when `EXPO_TOKEN` is set | `check-eas-secret` |
| `android-smoke` (Detox via EAS) | Android emu | when `EXPO_TOKEN` is set | `check-eas-secret` |
| `web-preview` (Cloudflare Pages) | web | when `CLOUDFLARE_*` are set AND event is `pull_request` | `check-cloudflare-secret` |

The first two were established by earlier work (S-1.1 / cycle-7). The
last three are added by S-1.7.

## Secrets the workflow expects

Provision these in **Settings → Secrets and variables → Actions** on
the repo (or org level if multiple repos share them).

| Secret | Used by | Purpose |
|--------|---------|---------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `e2e`, `ios-smoke`, `android-smoke`, `web-preview` | Clerk publishable key (development instance recommended for CI). |
| `EXPO_TOKEN` | `ios-smoke`, `android-smoke` | EAS auth for `eas build --local --non-interactive`. Generate via `eas login` → `eas account:create-token`. |
| `CLOUDFLARE_API_TOKEN` | `web-preview` | Scoped Cloudflare token with **Pages: Edit** permission. |
| `CLOUDFLARE_ACCOUNT_ID` | `web-preview` | The account that owns the `slabd-web` Pages project. |

When any of the above is **absent**, the workflow remains green: the
corresponding `check-<secret>` job emits a `::warning::`, and the
dependent job is skipped (not red). This keeps:

- forks usable without the maintainers needing to inject secrets;
- the repo green on the very first commits of a new feature when an
  unrelated secret has rotated;
- absence visible (warnings show in the workflow log) so it's a nudge
  to wire the secret, not a silent hole in coverage.

## The `skipped-with-warning` convention

Every secret-dependent job follows this exact shape:

```yaml
check-<secret>:
  name: check <secret>
  runs-on: ubuntu-latest
  outputs:
    have_<key>: ${{ steps.check.outputs.have_<key> }}
  steps:
    - id: check
      env: { S: ${{ secrets.<SECRET_NAME> }} }
      run: |
        if [ -n "$S" ]; then
          echo "have_<key>=true" >> "$GITHUB_OUTPUT"
        else
          echo "have_<key>=false" >> "$GITHUB_OUTPUT"
          echo "::warning::<SECRET_NAME> not set; <job> will be skipped"
        fi

<dependent-job>:
  needs: [unit, check-<secret>]
  if: needs.check-<secret>.outputs.have_<key> == 'true'
  # ...
```

When adding a new secret-gated job, copy this shape. **Do not** gate
directly on `${{ secrets.X }} != ''` in a job-level `if:` — that
context isn't available there, and the job will silently never run.

## The parity gate

REQ-027 says regressions on any single platform should block merge once
the platform's pipeline is wired. The mechanics:

1. **Configure branch protection** on `main`: require `unit`, `e2e`,
   `ios-smoke`, `android-smoke`, and `web-preview` as status checks.
2. When the relevant secret is absent, the job is **skipped**, which
   GitHub counts as **success** for the status check. That's the
   intent: a skipped job doesn't block merge but is visible as a
   warning.
3. When the secret **is** present and the job **fails**, the status
   check is red and merge is blocked.

Net effect: once a secret lands, the corresponding platform is on the
parity gate automatically — no workflow edit needed.

## Native smoke spec

The Detox smoke spec at `e2e/detox/smoke.test.js` is intentionally
minimal: launch the app, wait for the root view to render within 30s.
This is a **smoke** test — its job is to catch boot regressions
(missing native module, broken bridge, syntax error in entry), not to
exercise the full sign-up flow.

When EAS secrets land and the spec author can iterate locally, refine
to assert on a stable sign-up testID (see follow-up issue #31).

## Web preview comment

The `web-preview` job posts one sticky comment per PR via
`marocchino/sticky-pull-request-comment@v2`. The comment is **updated**
in place on each PR push, so the preview URL stays current and there's
no comment spam.

The preview is on Cloudflare Pages `slabd-web` project, branch-prefixed
URLs. Production deployment is **not** wired here — that lands in
S-3.10.

## Cost notes

- The macOS runner (`ios-smoke`) is ~10× the cost of an ubuntu runner.
  EAS Build does the heavy native build inside the macOS runner, so the
  job duration is dominated by build (~5–15 min per PR). Acceptable while
  parity coverage is non-negotiable; revisit if CI cost becomes a
  constraint.
- Cloudflare Pages preview deploys are free for our usage tier.

## Operational notes

- **Rotating `EXPO_TOKEN`**: generate a new token via `eas
  account:create-token`, paste into the repo secret. Existing PRs need a
  re-push to pick up the new token (or `re-run all jobs` on the
  workflow page).
- **Triaging a Detox failure**: artifact `detox-{ios,android}-artifacts`
  is uploaded on failure (logs + recordings under `artifacts/`).
  Retention: 7 days.
- **Forks**: secrets are not injected on PRs from forks (GitHub
  default). The skipped-with-warning behavior keeps fork PRs green;
  maintainers can push the fork branch to a maintainer-owned branch to
  exercise the full gate.
