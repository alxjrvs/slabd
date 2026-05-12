/**
 * GET /api/healthz
 *
 * Returns { status: "ok", db: "ok" | "down" }.
 * The DB probe runs SELECT 1 with a 1-second timeout; any error or
 * timeout degrades to db: "down" without throwing.
 *
 * AC-3: /api/healthz endpoint.
 */

import type { Context } from "hono";
import { sql } from "drizzle-orm";

import { db } from "~/lib/db/client";
import type { AppVars } from "../types";

export async function healthzHandler(
  c: Context<{ Variables: AppVars }>,
): Promise<Response> {
  const dbStatus = await probeDb();
  return c.json({ status: "ok", db: dbStatus });
}

async function probeDb(): Promise<"ok" | "down"> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new Error("DB probe timeout")), 1000);
  });

  try {
    await Promise.race([db.execute(sql`SELECT 1`), timeout]);
    return "ok";
  } catch {
    return "down";
  } finally {
    clearTimeout(timerId);
  }
}
