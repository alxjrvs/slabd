/**
 * Hono application factory.
 *
 * Returns a fully configured Hono instance with all routes wired.
 * The optional options parameter exists for testing — pass overrides
 * to inject in-memory mocks without touching production code paths.
 */

import { Hono } from "hono";

import { clerkAuth, type ClerkAuthOptions } from "./middleware/clerk-auth";
import {
  requireSellerOnboarded,
  type RequireSellerOnboardedOptions,
} from "./middleware/require-seller-onboarded";
import { healthzHandler } from "./routes/healthz";
import { meHandler } from "./routes/me";
import {
  onboardingStartHandler,
  type OnboardingStartDeps,
} from "./routes/onboarding-start";
import {
  onboardingStatusHandler,
  type OnboardingStatusDeps,
} from "./routes/onboarding-status";
import {
  stripeWebhookHandler,
  type StripeWebhookDeps,
} from "./routes/stripe-webhook";
import { listingsStubHandler } from "./routes/listings-stub";
import type { AppVars } from "./types";

export interface CreateAppOptions extends ClerkAuthOptions {
  onboardingStartDeps?: OnboardingStartDeps;
  onboardingStatusDeps?: OnboardingStatusDeps;
  stripeWebhookDeps?: StripeWebhookDeps;
  requireSellerOnboardedOptions?: RequireSellerOnboardedOptions;
}

export function createApp(
  options: CreateAppOptions = {},
): Hono<{ Variables: AppVars }> {
  const {
    onboardingStartDeps,
    onboardingStatusDeps,
    stripeWebhookDeps,
    requireSellerOnboardedOptions,
    ...clerkAuthOptions
  } = options;

  const app = new Hono<{ Variables: AppVars }>();

  // Health check — no auth.
  app.get("/api/healthz", healthzHandler);

  // Me — Clerk-gated.
  app.use("/api/me", clerkAuth(clerkAuthOptions));
  app.get("/api/me", meHandler);

  // Onboarding start — Clerk-gated.
  app.use("/api/onboarding/start", clerkAuth(clerkAuthOptions));
  app.post(
    "/api/onboarding/start",
    onboardingStartHandler(onboardingStartDeps),
  );

  // Onboarding status — Clerk-gated.
  app.use("/api/onboarding/status", clerkAuth(clerkAuthOptions));
  app.get(
    "/api/onboarding/status",
    onboardingStatusHandler(onboardingStatusDeps),
  );

  // Stripe webhook — NO Clerk auth; signature verification is the gate.
  app.post("/api/webhooks/stripe", stripeWebhookHandler(stripeWebhookDeps));

  // Listings stub — Clerk-gated + seller-onboarded gate.
  app.use("/api/listings", clerkAuth(clerkAuthOptions));
  app.use("/api/listings", requireSellerOnboarded(requireSellerOnboardedOptions));
  app.post("/api/listings", listingsStubHandler);

  return app;
}
