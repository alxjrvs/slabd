/**
 * Hono application factory.
 *
 * Returns a fully configured Hono instance.  Routes are wired in
 * cycle-3; this factory provides only the base app + middleware foundation
 * so the type-safe `c.var` contract is established.
 */

import { Hono } from "hono";
import type { AppVars } from "./types";

export function createApp(): Hono<{ Variables: AppVars }> {
  const app = new Hono<{ Variables: AppVars }>();
  return app;
}
