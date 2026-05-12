/**
 * POST /api/listings — stub handler.
 *
 * This is a stub for S-2.4 (full listing CRUD). The gate logic
 * (`requireSellerOnboarded()`) is applied upstream in the middleware chain;
 * by the time this handler runs, onboarding is confirmed complete.
 *
 * Wiring (cycle-5 will mount this):
 *   app.post("/api/listings", clerkAuth(), requireSellerOnboarded(), listingsStubHandler)
 */

import type { Context } from "hono";
import type { AppVars } from "../types";

/**
 * Returns `204 No Content`. Body parsing is intentionally omitted —
 * full listing validation lands in S-2.4.
 */
export function listingsStubHandler(c: Context<{ Variables: AppVars }>) {
  return c.body(null, 204);
}
