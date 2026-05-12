# Phase 5 — Ship

**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline
**PR:** https://github.com/alxjrvs/slabd/pull/46
**Shipped SHA:** `9cc514e`
**Closes:** #43

## What shipped

First backend code in the repo. Minimal authenticated REST API surface
that unblocks S-1.2 (Stripe Connect), S-1.3 (image upload), S-1.4 (GCD
catalog).

- Hono v4 on Expo Router API routes (catch-all)
- Clerk JWT verification (networkless JWKS cache via `jose`)
- Drizzle + Neon HTTP driver, `users` + `seller_accounts` schema
- `/api/healthz` + `/api/me`
- Cloudflare Pages deploy wiring + local `dev:api` workflow
- Test count: 129 passing across 23 suites (+15 new since main)

## Follow-ups filed

- #44 — Validate `iss` / `azp` claims + pin algorithms in Clerk JWT verify
- #45 — Rate-limit JWKS refetch on `kid` mismatch

**Both must land before S-1.2 dispatches** (Stripe Connect = first
authenticated write endpoint).

## Cycle commits on the run branch

- `2e4d3b0` — cycle-1: Hono app + Clerk JWT middleware
- `03226b1` — cycle-2: Drizzle schema + Neon HTTP client + initial migration
- `7039d4a` — cycle-3: /api/healthz + /api/me endpoints
- `ae8d385` — cycle-4: Cloudflare Pages wiring + local API dev workflow
- `1749917` — chore: jest ignores .claude / .worktrees (test discovery fix)

## Ontology terms accreted

- `seller_account`
- `clerk_auth_middleware`
- `api_route_handler`

(Merged into `docs/glossary/` in a follow-up — ontology pass deferred.)

## Next M1 dispatch

After this PR merges:
1. Address #44 and #45 (small fix-it cycle, can be one combined PR).
2. Dispatch S-1.2 (Stripe Connect, issue #3) with backend foundation now in place.
