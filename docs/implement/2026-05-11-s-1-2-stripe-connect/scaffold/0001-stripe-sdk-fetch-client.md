# ADR 0001 — Stripe SDK with fetch httpClient

**Status:** Accepted (2026-05-11)
**Context:** S-1.2 Stripe Connect Express seller onboarding (#3)

## Context

S-1.2 introduces the first Stripe-touching code in the repo. The backend
target is Cloudflare Pages running our Hono app under the Workers
runtime, while Jest tests run under Node. Stripe ships three usable
client surfaces:

1. **`stripe` npm package, default Node httpClient.** Officially
   supported, mature, full TypeScript. Uses `http`/`https` modules —
   **incompatible with Workers**.
2. **`stripe` npm package, fetch httpClient via `createFetchHttpClient()`.**
   Same package, same API, but routes every request through global
   `fetch`. Workers-compatible. Officially supported.
3. **Hand-rolled `fetch` calls against Stripe REST.** Smallest bundle,
   no SDK. We'd have to maintain types and re-derive request signing for
   webhook verification.
4. **`stripe-deno`.** Workers-friendly but a separate codebase, lags the
   Node SDK, and would split our import surface across two packages.

## Decision

Use the `stripe` npm package configured with
`Stripe.createFetchHttpClient()` (option 2). All Stripe API calls and
webhook signature verification go through this client.

Webhook signature verification uses
`stripe.webhooks.constructEventAsync` (not the synchronous variant) —
the async form uses `crypto.subtle` which is available in Workers; the
sync form depends on Node's `crypto` module.

## Consequences

**Positive:**

- One SDK, one type surface, runs identically under Node (Jest) and
  Workers (Cloudflare Pages). No environment-specific code paths.
- Future Stripe surface (PaymentIntents, transfers, refunds) inherits
  this client without setup.
- Webhook signature verification is networkless (constraint in
  manifest) — `constructEventAsync` does pure HMAC over `crypto.subtle`.

**Negative:**

- The Node SDK is larger than a hand-rolled REST surface; bundle size
  on Workers grows by ~80kB minified. Acceptable for now; revisit if
  we hit a hard Workers size limit.
- `createFetchHttpClient()` swallows some Node-only retry behaviors;
  we accept Stripe's documented retry semantics through fetch.

## Implementation notes

A single factory `lib/server/stripe/client.ts` exports
`getStripeClient(secretKey)` returning a memoized
`new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient(),
apiVersion: "<pinned>" })`. The API version is pinned to a single
deployment-time string so we don't get surprise upgrades.

## Alternatives rejected

- **Hand-rolled fetch (option 3):** maintenance burden on webhook
  verification (re-implementing HMAC verification with constant-time
  comparison) outweighs the bundle-size savings.
- **`stripe-deno` (option 4):** parallel-package drift risk; not
  worth the divergence.
