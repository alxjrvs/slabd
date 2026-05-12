# ADR 0003 — Seller onboarding status model

**Status:** Accepted (2026-05-11)
**Context:** S-1.2 Stripe Connect Express seller onboarding (#3)

## Context

The backend scaffold (#46) introduced `seller_accounts.onboarding_status`
as a free-form `text` column with a DB default of `'pending'`. S-1.2 is
the first consumer; we need to lock down the values it can hold and the
mapping from Stripe's Account payload into our domain.

Stripe's Account payload exposes (among others):

- `charges_enabled: boolean`
- `payouts_enabled: boolean`
- `details_submitted: boolean`
- `requirements.disabled_reason: string | null` (e.g. `"requirements.past_due"`,
  `"rejected.fraud"`, `"under_review"`)
- `requirements.currently_due: string[]`

We need a single status that the app can render and gate on.

## Decision

`seller_onboarding_status` is a four-value string union:

```
not_started | pending | complete | restricted
```

Mapping from Stripe Account payload:

| Stripe state | Our status |
|---|---|
| No `seller_accounts` row exists | `not_started` (synthesized at the API layer, never persisted) |
| Row exists, `details_submitted: false` | `pending` |
| Row exists, `details_submitted: true`, `charges_enabled: true`, `disabled_reason: null` | `complete` |
| Row exists, `disabled_reason !== null` OR `charges_enabled: false` after submission | `restricted` |

`payouts_enabled` is a separate boolean column, surfaced alongside
status. A seller can have `complete` onboarding but `payouts_enabled:
false` (Stripe sometimes gates payouts behind 1099-K threshold or
verification — out of scope for the gate but visible to the UI).

## Consequences

**Positive:**

- The DB column stays `text` — no enum migration required. Domain
  enforcement lives in TypeScript types (`SellerOnboardingStatus`) and
  the mapping function (`mapStripeAccountToStatus`).
- `not_started` synthesis means we never insert a placeholder row at
  user-create time. Sellers who never tap "become a seller" stay
  off-table.
- The four-value union matches what the listing gate cares about
  (only `complete` allows publish) and what the profile UI shows.

**Negative:**

- A free-form `text` column means a buggy writer could persist garbage.
  Mitigated by routing every write through the mapping function and a
  Zod parse at the API boundary.
- Future expansion (e.g. `disabled` distinct from `restricted`) is a
  type-only change but still a touch-everywhere migration.

## Implementation notes

- `lib/server/stripe/onboarding-status.ts` (lives inside cycle-1's
  Stripe folder) exports both the `SellerOnboardingStatus` union and
  the `mapStripeAccountToStatus(account)` function. Webhook handler
  calls it; tests pin every branch.
- `requireSellerOnboarded()` middleware checks `status === "complete"`
  only. `restricted` and `pending` both 403.
- `GET /api/onboarding/status` returns the union directly; clients
  switch on it.

## Alternatives rejected

- **Three-state model (`pending | complete | error`).** Lossy:
  `restricted` is recoverable (more KYC info), `error` implies
  terminal. Better to mirror Stripe's recoverable semantics.
- **Mirror Stripe's full state surface.** Too rich for the app UI;
  rendering five-plus disabled-reason strings doesn't help users.
