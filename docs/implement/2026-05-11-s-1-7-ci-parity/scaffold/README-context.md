# Context — S-1.7 cycle implementation

## Existing CI conventions (preserved)

The current `.github/workflows/ci.yml` has two patterns the new jobs must
match exactly:

1. **`oven-sh/setup-bun@v2`** with `bun-version: "1.3.13"` and
   `bun install --frozen-lockfile` as the first install step. Do not
   switch to npm/yarn or unpin the bun version.

2. **`check-<secret>` outputs-gating** for any job that depends on a
   repo secret. Pattern:
   - `check-X-secret` job emits a single boolean output
     (`have_<key>=true|false`) from a guarded env-var probe.
   - Dependent jobs `needs: [unit, check-X-secret]` and gate on
     `if: needs.check-X-secret.outputs.have_<key> == 'true'`.
   - When the secret is missing, the `check-X-secret` step emits a
     `::warning::` so it's visible in the workflow log.

## New jobs added by this cycle

| Job | Needs | Gate | Skip-when |
|-----|-------|------|-----------|
| `check-eas-secret` | — | always runs | — |
| `ios-smoke` | unit + check-eas-secret | `have_expo_token == 'true'` | EXPO_TOKEN secret missing |
| `android-smoke` | unit + check-eas-secret | `have_expo_token == 'true'` | EXPO_TOKEN secret missing |
| `check-cloudflare-secret` | — | always runs | — |
| `web-preview` | unit + check-cloudflare-secret | `have_cloudflare == 'true'` AND event is PR | secrets missing OR not a PR |

## Detox scaffolding contract

- Detox is **not** in `package.json` devDependencies. It is installed
  globally in the CI job only (`bun add -g detox-cli`). EAS CLI is also
  installed globally in-job.
- Detox uses its own jest config at `e2e/detox/jest.config.js`. The main
  jest config (`jest.config.js`) has `/e2e/` in `testPathIgnorePatterns`
  so unit runs never try to load the Detox spec.
- Smoke spec is `e2e/detox/smoke.test.js` (intentionally `.js`, not `.ts`,
  to avoid pulling in `@types/detox` as a local dev dep).

## Sign-up screen testID hooks

Note for future smoke-spec refinement: the auth screens at
`app/(auth)/sign-in.tsx` (which is actually the sign-up flow — see
follow-up issue #31) do not currently have explicit `testID` props.
Adding `testID="sign-up-entry"` to the root view of that screen would
let the smoke spec assert on a stable selector. Deferred to follow-up;
out of scope for this run.

## Secret keys this run introduces

The run does not commit any secret values; it documents the keys CI
expects to find:

- `EXPO_TOKEN` — auth for `eas build --local --non-interactive`.
- `CLOUDFLARE_API_TOKEN` — auth for `wrangler pages deploy`.
- `CLOUDFLARE_ACCOUNT_ID` — account scope for the deploy.

These are provisioned via GitHub repo settings → Secrets and variables →
Actions, documented in `docs/ci.md`.
