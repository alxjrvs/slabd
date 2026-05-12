---
cycle: 4
run_id: 2026-05-11-backend-scaffold-baseline
branch: cycle-4/backend-scaffold-baseline
head_sha: TBD — updated after commit
parent_sha: 17499172a24d52be1dfb48d562f3fc95b0d15140
---

# Cycle 4 — Cloudflare Pages deploy + local API dev workflow

## Summary

Implemented AC-4 (Cloudflare Pages env wiring) and the remainder of AC-5
(local dev script + README "Local API dev" section). Config and docs only —
no production code changed. No new tests required.

## Files changed

| File | Action |
|---|---|
| `wrangler.toml` | Created — Cloudflare Pages config; project `slabd-web`; `nodejs_compat`; empty `[vars]`, `[env.production.vars]`, `[env.preview.vars]` blocks with secret-management comments |
| `.env.example` | Modified — appended "Backend (API)" section: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE_URL` (commented) |
| `.github/workflows/ci.yml` | Modified — `web-preview` job: added `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` to `env:` block; added soft-warning step that emits `::warning::` lines for each unset backend secret (deploy still proceeds) |
| `package.json` | Modified — added `scripts.dev:api`: `bunx expo start --web --port 8081` |
| `README.md` | Modified — added "Development / Local API dev" section (env setup → `bun run dev:api` → smoke test curl → Neon branch + migration steps) |
| `docs/implement/2026-05-11-backend-scaffold-baseline/cycles/cycle-4.md` | Created — this file |

## Test counts

- Test suites: 23 passed (unchanged from cycle-3)
- Tests: 129 passed (unchanged from cycle-3)
- Failing: 0

Tests verified by running `bun run test:ci` from the main repo root
(`/Users/jarvis/Code/slabd`). Running directly from the worktree path fails
because the worktree is under `.claude/` which matches Jest's
`testPathIgnorePatterns` — this is intentional to prevent worktree tests from
running under the main tree's CI. The CI runs from the checked-out root so
all 129 tests pass.

## Smoke test

`bun run dev:api` was not executed locally due to sandbox restrictions
preventing dev server startup (port binding). Manual verification documented
in the README section "Local API dev": `curl http://localhost:8081/api/healthz`
should return `{ "status": "ok", "db": "ok" | "down" }`.

## ACs covered

- **AC-4** — full: `wrangler.toml` declares Pages config + `nodejs_compat` flag;
  CI `web-preview` job passes `DATABASE_URL`, `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY` from GH secrets; `.env.example` documents all
  new keys.
- **AC-5** — full (combined with cycle-3): `dev:api` script added to
  `package.json`; README "Local API dev" section covers env setup, startup,
  smoke test, and Neon branch provisioning.

## AC test evidence

| AC | Evidence |
|---|---|
| AC-4 | `wrangler.toml` — `name = "slabd-web"`, `pages_build_output_dir = "dist"`, `compatibility_flags = ["nodejs_compat"]`, `[env.production.vars]` + `[env.preview.vars]` blocks |
| AC-4 | `.github/workflows/ci.yml` `web-preview.env` — `DATABASE_URL: ${{ secrets.DATABASE_URL }}`, `CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}`, `CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}` |
| AC-4 | `.env.example` — "Backend (API)" section with all four new env vars |
| AC-5 | `package.json` — `"dev:api": "bunx expo start --web --port 8081"` |
| AC-5 | `README.md` — "Local API dev" section under "Development" |

## Deviations from plan

- The plan (line 133) says to create `wrangler.toml` "if absent" — it was
  absent, so created.
- The plan refers to a `check-cloudflare-secret`-style soft-warning pattern.
  Implemented as a dedicated `warn on missing backend secrets` step in
  `web-preview` using `[ -z "$VAR" ]` shell checks and `::warning::` output
  commands. Variables are read from the `env:` block (not from `secrets.*`
  context inside `run:`), which is the safe GH Actions pattern.
- `EXPO_PUBLIC_API_BASE_URL` is added to `.env.example` as a commented-out
  optional var (per instructions) rather than an active default. Not wired
  into CI because it's a client-side override; no server-side behavior changes.
- `dev:api` uses `bunx expo start --web --port 8081`. Expo Router 55 serves
  `+api.ts` routes inline during `expo start --web`, making a separate API
  process unnecessary. The `--web` flag targets the web renderer where API
  routes are active; `--port 8081` matches the README smoke-test URL.
