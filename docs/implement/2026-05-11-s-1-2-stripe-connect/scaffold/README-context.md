# Stripe Connect Express — implementation context

Reference doc for S-1.2 (#3). Read this alongside the four ADRs in
`scaffold/`. Surface map and operational notes for the next person
who touches this code.

## File map

```
lib/server/stripe/
├── client.ts              # getStripeClient() factory (ADR 0001)
├── idempotency.ts         # recordEvent() helper (ADR 0002)
└── onboarding-status.ts   # SellerOnboardingStatus union + mapping (ADR 0003)

lib/server/middleware/
└── require-seller-onboarded.ts   # publish gate (ADR 0004)

lib/server/routes/
├── onboarding-start.ts    # POST /api/onboarding/start (AC-1)
├── onboarding-status.ts   # GET  /api/onboarding/status (AC-3)
├── stripe-webhook.ts      # POST /api/webhooks/stripe (AC-2)
└── listings-stub.ts       # POST /api/listings stub (AC-4)

lib/db/
└── schema.ts              # adds stripe_webhook_events table (existing module)

drizzle/
└── 0001_stripe_webhook_events.sql

lib/server/__tests__/
├── stripe-client.test.ts
├── idempotency.test.ts
├── require-seller-onboarded.test.ts
├── onboarding-start.test.ts
├── stripe-webhook.test.ts
├── onboarding-status.test.ts
├── listings-gate.test.ts
└── stripe-connect.integration.test.ts
```

## Env vars

| Var | Where | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | `.env.example`, `wrangler.toml`, CI secret | Stripe API auth (sandbox: `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | `.env.example`, `wrangler.toml`, CI secret | HMAC secret for `Stripe-Signature` |
| `EXPO_PUBLIC_APP_URL` | `.env.example`, `wrangler.toml`, CI | Base URL for Account Link `return_url`/`refresh_url` |

CI declares all three in a soft-warn step so a missing secret produces
an actionable failure rather than a silent test pass.

## API surface added

| Method | Path | Auth | Gate |
|---|---|---|---|
| `POST` | `/api/onboarding/start` | Clerk JWT | — |
| `GET` | `/api/onboarding/status` | Clerk JWT | — |
| `POST` | `/api/webhooks/stripe` | Stripe signature | — |
| `POST` | `/api/listings` (stub) | Clerk JWT | `requireSellerOnboarded()` |

## Sandbox vs. production

S-1.2 ships **sandbox-only**. The webhook endpoint requires a Stripe
CLI tunnel (`stripe listen --forward-to localhost:8081/api/webhooks/stripe`)
during local dev. Production Stripe Connect setup (live keys, prod
webhook registration via Stripe Dashboard, terms-of-service for
Connect, branding) is a separate operations story — not gated on
code, gated on Stripe account approval.

## Operational follow-ups (out of scope here)

These are flagged for tracking, not for this PR:

- **Retention prune for `stripe_webhook_events`.** Table grows
  unbounded. ADR 0002 recommends a 90-day prune. Pick up in S-3.x or
  a small ops story.
- **KYC threshold escalation.** 1099-K (US$600/yr) triggers extended
  KYC. Lands in S-3.1.
- **Verified-seller badge surfacing.** S-1.2 captures the status; the
  badge is a listing-side render in a separate story (REQ-009 follow-up).
- **Production webhook secret rotation runbook.** Document under
  `docs/runbooks/` when we configure the prod endpoint.

## Failure modes a future contributor will hit

- **`constructEventAsync` not awaited.** The async form is mandatory
  under Workers; the sync form will throw at runtime. The handler
  test pins this.
- **`charges_enabled: true` without `details_submitted: true`.** Don't
  occur in practice, but `mapStripeAccountToStatus` treats this as
  `pending` to be safe.
- **Forgetting `Stripe.createFetchHttpClient()` on the SDK.** Jest
  works fine without it (Node has `http`); Workers blows up at
  request time. The `stripe-client.test.ts` asserts the constructed
  client uses the fetch httpClient.
