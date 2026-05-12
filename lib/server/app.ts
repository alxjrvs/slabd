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
import {
  listingsDraftCreateHandler,
  type ListingsDraftCreateDeps,
} from "./routes/listings-draft-create";
import {
  listingsDraftUpdateHandler,
  type ListingsDraftUpdateDeps,
} from "./routes/listings-draft-update";
import {
  listingsDraftGetHandler,
  type ListingsDraftGetDeps,
} from "./routes/listings-draft-get";
import {
  listingsPublishHandler,
  type ListingsPublishDeps,
} from "./routes/listings-publish";
import {
  listingsListHandler,
  type ListingsListDeps,
} from "./routes/listings-list";
import {
  createCatalogSearchHandler,
  type CatalogSearchDeps,
} from "./routes/catalog-search";
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
import { FixtureCatalogAdapter } from "./catalog/fixture-adapter";
import { db as defaultDb } from "~/lib/db";
import type { AppVars } from "./types";

export interface CreateAppOptions extends ClerkAuthOptions {
  onboardingStartDeps?: OnboardingStartDeps;
  onboardingStatusDeps?: OnboardingStatusDeps;
  stripeWebhookDeps?: StripeWebhookDeps;
  requireSellerOnboardedOptions?: RequireSellerOnboardedOptions;
  catalogSearchDeps?: CatalogSearchDeps;
  listingsImagesUploadUrlDeps?: ListingsImagesUploadUrlDeps;
  listingsImagesConfirmDeps?: ListingsImagesConfirmDeps;
  listingsImagesListDeps?: ListingsImagesListDeps;
  listingsDraftCreateDeps?: ListingsDraftCreateDeps;
  listingsDraftUpdateDeps?: ListingsDraftUpdateDeps;
  listingsDraftGetDeps?: ListingsDraftGetDeps;
  listingsPublishDeps?: ListingsPublishDeps;
  listingsListDeps?: ListingsListDeps;
}

export function createApp(
  options: CreateAppOptions = {},
): Hono<{ Variables: AppVars }> {
  const {
    onboardingStartDeps,
    onboardingStatusDeps,
    stripeWebhookDeps,
    requireSellerOnboardedOptions,
    catalogSearchDeps,
    listingsImagesUploadUrlDeps,
    listingsImagesConfirmDeps,
    listingsImagesListDeps,
    listingsDraftCreateDeps,
    listingsDraftUpdateDeps,
    listingsDraftGetDeps,
    listingsPublishDeps,
    listingsListDeps,
    ...clerkAuthOptions
  } = options;

  const ttlDays =
    parseInt(process.env.CATALOG_CACHE_TTL_DAYS ?? "", 10) || 30;

  const resolvedCatalogSearchDeps: CatalogSearchDeps = catalogSearchDeps ?? {
    db: defaultDb as unknown as CatalogSearchDeps["db"],
    adapter: new FixtureCatalogAdapter(),
    env: { CATALOG_CACHE_TTL_DAYS: ttlDays },
  };

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

  // POST /api/listings/draft — Clerk + onboarding gate.
  app.use("/api/listings/draft", clerkAuth(clerkAuthOptions));
  app.use("/api/listings/draft", requireSellerOnboarded(requireSellerOnboardedOptions));
  app.post("/api/listings/draft", listingsDraftCreateHandler(listingsDraftCreateDeps));

  // PATCH/GET /api/listings/draft/:id — Clerk + onboarding gate (ownership in handler).
  app.use("/api/listings/draft/:id", clerkAuth(clerkAuthOptions));
  app.use("/api/listings/draft/:id", requireSellerOnboarded(requireSellerOnboardedOptions));
  app.patch("/api/listings/draft/:id", listingsDraftUpdateHandler(listingsDraftUpdateDeps));
  app.get("/api/listings/draft/:id", listingsDraftGetHandler(listingsDraftGetDeps));

  // GET /api/listings — PUBLIC index. No Clerk gate.
  // Must be registered BEFORE /:id/publish to avoid route shadowing.
  app.get("/api/listings", listingsListHandler(listingsListDeps));

  // POST /api/listings/:id/publish — Clerk + onboarding gate (ownership in handler).
  app.use("/api/listings/:id/publish", clerkAuth(clerkAuthOptions));
  app.use("/api/listings/:id/publish", requireSellerOnboarded(requireSellerOnboardedOptions));
  app.post("/api/listings/:id/publish", listingsPublishHandler(listingsPublishDeps));

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

  // Catalog search — Clerk-gated.
  app.use("/api/catalog/search", clerkAuth(clerkAuthOptions));
  app.get("/api/catalog/search", createCatalogSearchHandler(resolvedCatalogSearchDeps));

  return app;
}
