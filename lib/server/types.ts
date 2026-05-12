/**
 * Hono context Variables injected by clerkAuth() middleware.
 * Handlers that run after clerkAuth() can read `c.var.userId` and
 * `c.var.email` without null-checking — the middleware 401s if either
 * is absent.
 */
export type AppVars = {
  userId: string;
  email: string;
};
