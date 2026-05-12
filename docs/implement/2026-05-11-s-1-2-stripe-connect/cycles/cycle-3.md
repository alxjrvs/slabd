---
run_id: 2026-05-11-s-1-2-stripe-connect
cycle: 3
acs_covered: [AC-2]
branch: cycle-3/s-1-2-stripe-webhook
status: complete
---

# Cycle 3 — Stripe webhook handler (AC-2)

## Files written

- `lib/server/routes/stripe-webhook.ts` — `stripeWebhookHandler` factory
- `lib/server/__tests__/stripe-webhook.test.ts` — 5 tests, all passing

## Implementation notes

The handler follows the options-injection pattern established by other
handlers in the codebase (`deps.db`, `deps.stripe`, `deps.env`).

Key decisions:

1. **Raw body via `c.req.text()`** — Stripe's HMAC is over raw bytes;
   using `.json()` would re-serialize and break signature verification.

2. **`constructEventAsync`** — async form per ADR-0001 (Workers-safe).
   The sync form depends on Node's `crypto` module which is unavailable
   on Workers.

3. **Logger over console** — The project's `lib/logger.ts` utility is
   used for `error` (bad signature) and `warn` (unknown account ID)
   rather than direct `console.*` calls, which are banned by ESLint in
   `lib/**`.

4. **Test sign helper** — `Stripe.webhooks.generateTestHeaderString` is
   synchronous but the Stripe ESM build routes through `SubtleCryptoProvider`
   (async-only) under Bun, causing it to throw. The test uses a manual
   `crypto.createHmac('sha256', secret)` signer that produces the same
   `t=<unix>,v1=<hmac-hex>` format and is verified against `constructEventAsync`.

## Verification

```
bun run typecheck  # clean
bun run lint       # clean
bun test lib/server/__tests__/stripe-webhook.test.ts  # 5 pass, 0 fail
```
