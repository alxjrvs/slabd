/**
 * GET /api/me
 *
 * Clerk-gated endpoint. Returns { userId, email } from JWT claims.
 * No DB lookup — AC-3 explicitly defers DB hydration.
 *
 * AC-3: /api/me endpoint.
 */

import type { Context } from "hono";
import type { AppVars } from "../types";

export function meHandler(c: Context<{ Variables: AppVars }>): Response {
  return c.json({ userId: c.var.userId, email: c.var.email });
}
