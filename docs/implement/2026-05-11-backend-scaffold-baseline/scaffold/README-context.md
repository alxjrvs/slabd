# Scaffold context — backend scaffold baseline

This run lands the **first backend code** in the repo. Until now, the
project has been an Expo client (mobile + web) with Clerk auth and S-1.5
observability. This run produces a minimal authenticated REST API that
unblocks S-1.2, S-1.3, and S-1.4.

## ADRs in this scaffold

1. [ADR-0001 — Runtime](./0001-runtime-expo-router-api-routes-on-cloudflare-pages.md):
   Expo Router API routes on Cloudflare Pages (interim — Fly.io is the
   architecture's prod target, deferred until async jobs are needed).
2. [ADR-0002 — Framework](./0002-framework-hono.md): Hono v4.
3. [ADR-0003 — DB driver](./0003-database-neon-http-driver.md):
   `@neondatabase/serverless` HTTP driver via Drizzle's `neon-http`
   adapter.
4. [ADR-0004 — Auth](./0004-auth-clerk-networkless-jwt.md): Clerk JWT
   verification with cached JWKS (no network in the hot path).
5. [ADR-0005 — Migrations](./0005-migrations-drizzle-kit.md):
   `drizzle-kit generate` with committed SQL; apply step deferred.

## File layout introduced

```
app/api/[...path]+api.ts          # Expo Router catch-all → Hono
lib/server/
  app.ts                          # createApp() factory
  types.ts                        # Hono Variables type
  middleware/
    clerk-auth.ts                 # clerkAuth() middleware
  routes/
    healthz.ts                    # GET /api/healthz
    me.ts                         # GET /api/me (clerk-gated)
  __tests__/
    clerk-auth.test.ts
    healthz.test.ts
    me.test.ts
lib/db/
  client.ts                       # Drizzle + Neon HTTP client
  schema.ts                       # users + seller_accounts
  index.ts
  __tests__/
    schema.test.ts
drizzle.config.ts
drizzle/
  0000_init.sql
  meta/_journal.json
wrangler.toml                     # CF Pages bindings
.env.example                      # adds DATABASE_URL + CLERK_*
README.md                         # adds "Local API dev" section
```

## What this story doesn't do

- No Stripe Connect endpoints (S-1.2).
- No image upload pipeline (S-1.3).
- No GCD catalog endpoints (S-1.4).
- No automated migration runner in CI/deploy (follow-up).
- No BullMQ / async workers (deferred to Fly.io migration).
- No Fly.io deploy (deferred — captured in ADR-0001 deferred decisions).

## How cycles consume this scaffold

- **cycle-1** owns `lib/server/app.ts`, `lib/server/middleware/clerk-auth.ts`,
  `lib/server/types.ts`, and the auth middleware tests.
- **cycle-2** owns everything under `lib/db/`, `drizzle.config.ts`, and
  the generated SQL.
- **cycle-3** owns `app/api/[...path]+api.ts`, `lib/server/routes/*`,
  and the handler tests. Depends on cycle-1 and cycle-2.
- **cycle-4** owns `wrangler.toml`, `.env.example`, `package.json` script
  changes, the GH Actions workflow update, and README.
