/**
 * Hono application factory.
 *
 * Returns a fully configured Hono instance with all routes wired.
 * The optional `options` parameter exists for testing — pass `fetchJwks`
 * to inject an in-memory JWKS so no network traffic occurs in tests.
 */

import { Hono } from "hono";

import { clerkAuth, type ClerkAuthOptions } from "./middleware/clerk-auth";
import { healthzHandler } from "./routes/healthz";
import { meHandler } from "./routes/me";
import type { AppVars } from "./types";

export function createApp(
  options: ClerkAuthOptions = {},
): Hono<{ Variables: AppVars }> {
  const app = new Hono<{ Variables: AppVars }>();

  app.get("/api/healthz", healthzHandler);

  app.use("/api/me", clerkAuth(options));
  app.get("/api/me", meHandler);

  return app;
}
