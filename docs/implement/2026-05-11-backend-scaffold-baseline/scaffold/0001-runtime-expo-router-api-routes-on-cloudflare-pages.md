# ADR-0001 — Backend runtime: Expo Router API routes on Cloudflare Pages

**Status:** Accepted (interim — see *Deferred decisions*)
**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline
**Deciders:** @alxjrvs

## Context

The architecture (`ideate/architecture.md` line 559) targets **Fly.io** as
the production API runtime, paired with BullMQ workers for async jobs and
Cloudflare Pages for admin/static. Today the repo is Expo-only — there is
no backend. S-1.2, S-1.3, and S-1.4 all need an authenticated REST API,
so this story stands up a minimal API surface.

We need to pick the runtime *now*, not for production scale, but to
unblock the next three stories. Each minute spent provisioning Fly.io is
a minute not spent on Stripe/images/catalog logic.

## Decision

Mount the API on **Expo Router API routes (`+api.ts`)** behind Hono,
deployed to **Cloudflare Pages** via the existing CI pipeline.

Specifically:
- `app/api/[...path]+api.ts` — a single catch-all route that delegates
  to Hono's `app.fetch(request)`.
- `lib/server/*` — Hono app factory, middleware, and route handlers.
- Deploy: Expo's static export emits the `+api.ts` routes as Workers-
  compatible handlers, which Cloudflare Pages serves alongside the web
  bundle.

## Consequences

**Positive:**
- **No new infra.** Cloudflare Pages is already in CI (S-1.7 wired the
  preview-URL pipeline). Same secrets surface, same workflow.
- **Same deploy as web.** Each PR's preview URL gets a full API +
  client, so end-to-end testing against a preview is trivial.
- **Portable code.** Hono is cross-runtime by design. The Hono app
  doesn't import anything Workers-specific; the migration target is a
  Node/Bun host (Fly.io) that runs the same `createApp()`.

**Negative:**
- **Diverges from architecture's Fly.io target.** When BullMQ workers or
  long-lived connections (websockets, SSE, queues) are needed, we'll
  need to lift-and-shift the Hono app to Fly.io. This is captured as
  a deferred decision below.
- **Workers limits.** No filesystem, no Node built-ins outside the
  allowlist, 30s CPU cap on Pages Functions, 100MB memory. Acceptable
  for healthz/me/CRUD; problematic for image processing, long polls,
  or Stripe webhook retries with backoff. Those flows route to the
  Fly.io migration when they land.
- **Two deployments to coordinate (cosmetic).** The same git push deploys
  both client and API. If the API has a bug, rollback rolls back the
  client too. Acceptable for now — separating them is a follow-up if
  the coupling bites.

## Alternatives considered

**Fly.io now (architecture's target):** rejected. Requires Fly account,
secrets provisioning, separate deploy pipeline. ~2 days of yak-shaving
before the first endpoint. Premature given that none of S-1.2/3/4 need
workers yet.

**Cloudflare Workers (standalone, not Pages Functions):** rejected.
Same runtime constraints as Pages Functions but a separate deploy and
domain. No benefit over Pages Functions until we need fine-grained
Worker routing.

**Vercel API Routes:** rejected. New vendor in the stack; architecture
already commits to Cloudflare for CDN/images/storage.

## Deferred decisions

- **Migration to Fly.io.** Trigger: first need for an async worker
  (BullMQ, long-lived job), webhook backoff with retries, or a route
  that exceeds Workers' 30s CPU limit. The migration is one Dockerfile
  + a `bun run server.ts` entrypoint that imports `createApp()`.
- **Splitting API and web deploys.** Trigger: coupled-rollback incident
  or a need to deploy API independently from the client.

## REQ traceability

REQ-006 (foundation only), REQ-008 (foundation), REQ-013 (foundation),
REQ-033 (foundation).
