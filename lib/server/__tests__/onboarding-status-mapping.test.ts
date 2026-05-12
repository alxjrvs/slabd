/**
 * Tests for lib/server/stripe/onboarding-status.ts
 *
 * Pins every branch per ADR-0003:
 * - details_submitted: false → 'pending'
 * - details_submitted: true, charges_enabled: true, disabled_reason: null → 'complete'
 * - disabled_reason !== null → 'restricted'
 * - charges_enabled: false after submission → 'restricted'
 *
 * Note: 'not_started' is NOT produced by mapStripeAccountToStatus.
 * It is synthesized at the API layer when no row exists.
 */

import {
  mapStripeAccountToStatus,
  type SellerOnboardingStatus,
} from "../stripe/onboarding-status";

describe("mapStripeAccountToStatus", () => {
  it("returns 'pending' when details_submitted is false", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: false,
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { disabled_reason: null },
    });
    const expected: SellerOnboardingStatus = "pending";
    expect(result).toBe(expected);
  });

  it("returns 'pending' when details_submitted is false (ignores charges_enabled)", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: false,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { disabled_reason: null },
    });
    expect(result).toBe("pending");
  });

  it("returns 'complete' when details_submitted, charges_enabled true and no disabled_reason", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { disabled_reason: null },
    });
    const expected: SellerOnboardingStatus = "complete";
    expect(result).toBe(expected);
  });

  it("returns 'complete' when requirements is undefined (no disabled_reason)", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: false,
    });
    expect(result).toBe("complete");
  });

  it("returns 'restricted' when disabled_reason is set (past_due)", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: false,
      requirements: { disabled_reason: "requirements.past_due" },
    });
    const expected: SellerOnboardingStatus = "restricted";
    expect(result).toBe(expected);
  });

  it("returns 'restricted' when disabled_reason is 'rejected.fraud'", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { disabled_reason: "rejected.fraud" },
    });
    expect(result).toBe("restricted");
  });

  it("returns 'restricted' when charges_enabled is false after details_submitted", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { disabled_reason: null },
    });
    expect(result).toBe("restricted");
  });

  it("returns 'restricted' when both charges_enabled false AND disabled_reason set", () => {
    const result = mapStripeAccountToStatus({
      details_submitted: true,
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { disabled_reason: "under_review" },
    });
    expect(result).toBe("restricted");
  });

  it("never returns 'not_started' (that value is synthesized at the API layer)", () => {
    const inputs = [
      { details_submitted: false, charges_enabled: false, payouts_enabled: false },
      { details_submitted: true, charges_enabled: true, payouts_enabled: true },
      {
        details_submitted: true,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: { disabled_reason: "under_review" },
      },
    ];

    for (const input of inputs) {
      const result = mapStripeAccountToStatus(input);
      expect(result).not.toBe("not_started");
    }
  });
});
