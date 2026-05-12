/**
 * Seller onboarding status domain model.
 *
 * Four-value union per ADR-0003. `not_started` is synthesized at the API
 * layer when no `seller_accounts` row exists — `mapStripeAccountToStatus`
 * never produces it.
 *
 * Mapping from Stripe Account payload:
 *   details_submitted: false                             → 'pending'
 *   details_submitted: true, charges_enabled: true,
 *     disabled_reason: null                              → 'complete'
 *   disabled_reason !== null OR charges_enabled: false
 *     after submission                                   → 'restricted'
 */

/** Domain status union for seller onboarding. */
export type SellerOnboardingStatus =
  | "not_started"
  | "pending"
  | "complete"
  | "restricted";

/** Minimal Stripe Account shape consumed by the mapping function. */
export interface StripeAccountLike {
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: {
    disabled_reason?: string | null;
  };
}

/**
 * Map a Stripe Account payload to our domain `SellerOnboardingStatus`.
 *
 * Never returns `'not_started'` — that value is synthesized by the API
 * layer when no `seller_accounts` row exists.
 */
export function mapStripeAccountToStatus(
  account: StripeAccountLike,
): Exclude<SellerOnboardingStatus, "not_started"> {
  const { details_submitted, charges_enabled, requirements } = account;
  const disabledReason = requirements?.disabled_reason ?? null;

  if (!details_submitted) {
    return "pending";
  }

  if (disabledReason !== null || !charges_enabled) {
    return "restricted";
  }

  return "complete";
}
