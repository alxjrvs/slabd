/**
 * Tests for GET /api/me handler.
 *
 * AC-3: /api/me is Clerk-gated; returns { userId, email } from JWT claims.
 * AC-5: handler tests use mocked JWKS (no live Clerk dep).
 */

import { createApp } from "../app";
import { __resetJwksCacheForTests } from "../middleware/clerk-auth";
import { buildJwks } from "./_jwks-helpers";

beforeEach(() => {
  __resetJwksCacheForTests();
});

describe("AC-3: GET /api/me — no Authorization header", () => {
  it("returns 401 + { error: 'missing_token' } without authorization header", async () => {
    const { jwks } = await buildJwks();
    const app = createApp({ fetchJwks: async () => jwks });
    const res = await app.request("/api/me");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "missing_token" });
  });
});

describe("AC-3: GET /api/me — malformed token", () => {
  it("returns 401 + { error: 'invalid_token' } for malformed JWT", async () => {
    const { jwks } = await buildJwks();
    const app = createApp({ fetchJwks: async () => jwks });
    const res = await app.request("/api/me", {
      headers: { Authorization: "Bearer not.a.real.token" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_token" });
  });
});

describe("AC-3: GET /api/me — valid token returns userId and email", () => {
  it("returns 200 + { userId, email } for valid JWT", async () => {
    const { jwks, signJwt } = await buildJwks();
    const token = await signJwt();
    const app = createApp({ fetchJwks: async () => jwks });

    const res = await app.request("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: "user_123", email: "test@example.com" });
  });
});
