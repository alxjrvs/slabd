/**
 * Tests for clerkAuth() Hono middleware.
 *
 * JWT signing uses jose to generate an in-memory JWK set.  The JWKS
 * fetcher is injected via the factory's `fetchJwks` option so no
 * network traffic occurs during testing.
 *
 * AC-1: Hono on Expo Router with Clerk JWT middleware.
 * AC-5: middleware tests with mocked JWKS.
 */

import { Hono } from "hono";
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  generateKeyPair as generateWrongKeyPair,
} from "jose";
import type { JSONWebKeySet } from "jose";

import { clerkAuth, __resetJwksCacheForTests } from "../middleware/clerk-auth";
import type { AppVars } from "../types";

// ---------------------------------------------------------------------------
// Helpers: in-memory JWK set + JWT factory
// ---------------------------------------------------------------------------

async function buildJwks(): Promise<{
  jwks: JSONWebKeySet;
  signJwt: (overrides?: Partial<Record<string, unknown>>) => Promise<string>;
}> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = "test-key-1";

  const jwks: JSONWebKeySet = { keys: [{ ...publicJwk, kid: "test-key-1" }] };

  const signJwt = async (overrides: Partial<Record<string, unknown>> = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      sub: "user_123",
      email: "test@example.com",
      sid: "sess_abc",
      iss: "https://clerk.example.com",
      iat: now,
      nbf: now,
      exp: now + 300,
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .sign(privateKey);
  };

  return { jwks, signJwt };
}

function buildApp(
  fetchJwks: () => Promise<JSONWebKeySet>,
): Hono<{ Variables: AppVars }> {
  const app = new Hono<{ Variables: AppVars }>();
  app.use("*", clerkAuth({ fetchJwks }));
  app.get("/protected", (c) =>
    c.json({ userId: c.var.userId, email: c.var.email }),
  );
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Each test supplies its own JWKS via the fetchJwks factory arg.
  // Reset the module-level cache so tests don't bleed into one another.
  __resetJwksCacheForTests();
});

describe("AC-1: clerkAuth middleware — missing Authorization header returns 401 missing_token", () => {
  it("returns 401 with { error: 'missing_token' } when no Authorization header", async () => {
    const { jwks } = await buildJwks();
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "missing_token" });
  });
});

describe("AC-1: clerkAuth middleware — malformed JWT returns 401 invalid_token", () => {
  it("returns 401 with { error: 'invalid_token' } for malformed JWT", async () => {
    const { jwks } = await buildJwks();
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer not.a.real.token" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_token" });
  });
});

describe("AC-1: clerkAuth middleware — wrong signing key returns 401 invalid_token", () => {
  it("returns 401 with { error: 'invalid_token' } for token signed by wrong key", async () => {
    const { jwks } = await buildJwks(); // registered keys
    const { privateKey: wrongKey } = await generateWrongKeyPair("RS256");

    const now = Math.floor(Date.now() / 1000);
    const tokenFromWrongKey = await new SignJWT({
      sub: "user_999",
      email: "attacker@example.com",
      sid: "sess_evil",
      iss: "https://clerk.example.com",
      iat: now,
      nbf: now,
      exp: now + 300,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key-1" })
      .sign(wrongKey);

    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${tokenFromWrongKey}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_token" });
  });
});

describe("AC-1: clerkAuth middleware — expired token returns 401 invalid_token", () => {
  it("returns 401 with { error: 'invalid_token' } for expired token", async () => {
    const { jwks, signJwt } = await buildJwks();
    const pastTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const expiredToken = await signJwt({
      iat: pastTimestamp,
      nbf: pastTimestamp,
      exp: pastTimestamp + 1, // already expired
    });

    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_token" });
  });
});

describe("AC-1: clerkAuth middleware — valid token passes through and sets context vars", () => {
  it("calls next() and sets c.var.userId + c.var.email for valid token", async () => {
    const { jwks, signJwt } = await buildJwks();
    const token = await signJwt();

    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userId: "user_123", email: "test@example.com" });
  });
});
