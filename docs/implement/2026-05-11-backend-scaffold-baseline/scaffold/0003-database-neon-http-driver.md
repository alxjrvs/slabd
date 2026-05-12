# ADR-0003 — Database driver: @neondatabase/serverless (HTTP)

**Status:** Accepted
**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline

## Context

Architecture commits to **Neon Postgres** (line 567) with Drizzle ORM
(line 601). On Cloudflare Workers / Pages Functions (ADR-0001), the
standard `pg` driver doesn't work — it requires TCP and Node built-ins.
Neon ships an HTTP/WebSocket-based driver designed for serverless
environments.

## Decision

Use **`@neondatabase/serverless`** with Drizzle's `drizzle-orm/neon-http`
adapter. Single `db` singleton exported from `lib/db/client.ts`.

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

## Consequences

**Positive:**
- Workers-compatible out of the box (HTTP transport).
- Drizzle's type inference is preserved.
- Per-request connection (no pooling needed at the driver layer — Neon
  handles pooling server-side).
- Same driver works on Node/Bun (HTTP works anywhere), so the
  Fly.io-migration target doesn't require a driver swap.

**Negative:**
- HTTP transport per query (no prepared-statement reuse across queries).
  Mitigated by Neon's compute-side caching; revisit if a hot path
  shows query-overhead in metrics.
- No transaction support over the `neon-http` adapter for multi-
  statement transactions. Workaround: use `neon-serverless`
  (WebSocket) when we need transactions. Out of scope for this story.

## Alternatives considered

**`pg` (node-postgres):** rejected. TCP only; doesn't run on Workers.

**`postgres.js`:** rejected. TCP only; same Workers blocker.

**Neon's WebSocket driver (`@neondatabase/serverless` with `Pool`):**
deferred. We don't need transactions in this story (healthz is `SELECT 1`,
schema is the only DB change). When the first multi-statement
transaction lands, switch the import at the call site.
