import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy DB client — only instantiated outside of test environments.
 * In NODE_ENV==="test" or when JEST_WORKER_ID is set, this module is
 * imported for types only; calling `db.*` in tests will return a
 * stub so tests don't crash when DATABASE_URL is absent.
 */

const isTestEnv =
  process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbClient | null = null;

function getDb(): DbClient {
  if (isTestEnv) {
    // Return a stub rather than crashing — schema tests don't need a live client.
    return {} as DbClient;
  }

  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your environment before starting the server."
    );
  }

  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    return getDb()[prop as keyof DbClient];
  },
});
