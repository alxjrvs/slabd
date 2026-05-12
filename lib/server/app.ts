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
import {
  listingsImagesUploadUrlHandler,
  type ListingsImagesUploadUrlDeps,
} from "./routes/listings-images-upload-url";
import {
  listingsImagesConfirmHandler,
  type ListingsImagesConfirmDeps,
} from "./routes/listings-images-confirm";
import {
  listingsImagesListHandler,
  type ListingsImagesListDeps,
} from "./routes/listings-images-list";
import type { AppVars } from "./types";

export interface CreateAppOptions extends ClerkAuthOptions {
  onboardingStartDeps?: OnboardingStartDeps;
  onboardingStatusDeps?: OnboardingStatusDeps;
  stripeWebhookDeps?: StripeWebhookDeps;
  requireSellerOnboardedOptions?: RequireSellerOnboardedOptions;
  listingsImagesUploadUrlDeps?: ListingsImagesUploadUrlDeps;
  listingsImagesConfirmDeps?: ListingsImagesConfirmDeps;
  listingsImagesListDeps?: ListingsImagesListDeps;
}

export function createApp(
  options: CreateAppOptions = {},
): Hono<{ Variables: AppVars }> {
  const {
    onboardingStartDeps,
    onboardingStatusDeps,
    stripeWebhookDeps,
    requireSellerOnboardedOptions,
    listingsImagesUploadUrlDeps,
    listingsImagesConfirmDeps,
    listingsImagesListDeps,
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

  // Listings images: upload-url — Clerk-gated.
  app.use("/api/listings/:id/images/upload-url", clerkAuth(clerkAuthOptions));
  app.post(
    "/api/listings/:id/images/upload-url",
    listingsImagesUploadUrlHandler(listingsImagesUploadUrlDeps),
  );

  // Listings images: confirm — Clerk-gated.
  app.use("/api/listings/:id/images/confirm", clerkAuth(clerkAuthOptions));
  app.post(
    "/api/listings/:id/images/confirm",
    listingsImagesConfirmHandler(listingsImagesConfirmDeps),
  );

  // Listings images: list — PUBLIC (no Clerk gate, per REQ-004).
  app.get(
    "/api/listings/:id/images",
    listingsImagesListHandler(listingsImagesListDeps),
  );

  return app;
}
