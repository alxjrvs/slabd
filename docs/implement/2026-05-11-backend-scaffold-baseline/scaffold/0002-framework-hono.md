# ADR-0002 — Framework: Hono

**Status:** Accepted
**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline

## Context

Architecture (line 600, line 169) calls for "REST API (Hono) with OpenAPI
3.0 generated from Zod". We need a request-handling framework that:

- Runs unmodified on Cloudflare Workers (ADR-0001's target).
- Runs unmodified on Node/Bun (the eventual Fly.io target).
- Has first-class TypeScript + Zod integration.
- Composes middleware predictably (auth → route).

## Decision

Use **Hono v4** as the request framework, with one Hono app instance
returned by a `createApp()` factory in `lib/server/app.ts`. Routes mount
via `app.get(...)`. Middleware mounts via `app.use(...)`. The Expo
Router `+api.ts` file is a thin shim that calls `createApp().fetch(req)`.

## Consequences

**Positive:**
- Cross-runtime by design. Same code on Workers, Node, Bun.
- Type-safe `c.var` (we'll declare `Variables = { userId: string }`).
- `@hono/zod-openapi` is already on the long-term roadmap (architecture
  line 600). Out of scope for this story; lands when API surface grows.
- Tiny: ~20KB minified, no transitive bloat.

**Negative:**
- No built-in DI; we'll keep dependencies in module scope (`db`,
  `clerkClient`) and inject for tests via factory params.
- Smaller community than Express/Fastify. Mitigated by Hono's docs
  being excellent.

## Alternatives considered

**Express:** rejected. Not Workers-compatible without polyfills; the
"runs anywhere" property is non-negotiable given ADR-0001.

**Fastify:** rejected. Same Workers issue.

**Itty Router:** rejected. Too minimal — middleware composition is
manual.

**Raw `fetch` handlers:** rejected. Would have to reinvent middleware
ordering, route matching, type-safe `c.var`.
