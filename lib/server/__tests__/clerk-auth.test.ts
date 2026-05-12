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
import { buildJwks as buildSharedJwks } from "./_jwks-helpers";
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

// ---------------------------------------------------------------------------
// #44 — iss / azp / algorithm validation
// ---------------------------------------------------------------------------

describe("#44: clerkAuth middleware — iss validation", () => {
  afterEach(() => {
    delete process.env.CLERK_FRONTEND_API;
  });

  it("rejects a token with a mismatched iss (401 invalid_token)", async () => {
    const { jwks, signJwt } = await buildJwks();
    // Set CLERK_FRONTEND_API so the middleware has an issuer to validate against.
    process.env.CLERK_FRONTEND_API = "https://clerk.example.com";

    const token = await signJwt({ iss: "https://evil.clerk.accounts.dev" });
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_token" });
  });
});

describe("#44: clerkAuth middleware — azp validation", () => {
  beforeEach(() => {
    // Ensure CLERK_FRONTEND_API is unset so iss is not validated in azp tests.
    delete process.env.CLERK_FRONTEND_API;
  });

  afterEach(() => {
    delete process.env.CLERK_ALLOWED_AZP;
  });

  it("rejects a token with azp not in CLERK_ALLOWED_AZP allowlist (401 invalid_azp)", async () => {
    const { jwks, signJwt } = await buildSharedJwks();
    process.env.CLERK_ALLOWED_AZP =
      "https://app.example.com,https://app.example.dev";

    const token = await signJwt({ azp: "https://attacker.example.com" });
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_azp" });
  });

  it("allows a token with azp in the CLERK_ALLOWED_AZP allowlist (200)", async () => {
    const { jwks, signJwt } = await buildSharedJwks();
    process.env.CLERK_ALLOWED_AZP =
      "https://app.example.com,https://app.example.dev";

    const token = await signJwt({ azp: "https://app.example.com" });
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  it("allows a token without azp when CLERK_ALLOWED_AZP is unset", async () => {
    const { jwks, signJwt } = await buildSharedJwks();
    // CLERK_ALLOWED_AZP is unset (deleted in afterEach from prior run / beforeEach)

    // signJwt default payload has no azp
    const token = await signJwt();
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  it("rejects a token without azp when CLERK_ALLOWED_AZP is set (401 invalid_azp)", async () => {
    const { jwks, signJwt } = await buildSharedJwks();
    process.env.CLERK_ALLOWED_AZP = "https://app.example.com";

    // signJwt default payload has no azp — override to explicitly omit it
    const token = await signJwt({ azp: undefined });
    const app = buildApp(async () => jwks);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_azp" });
  });
});

// ---------------------------------------------------------------------------
// #45 — JWKS refetch rate-limit + in-flight coalescing
// ---------------------------------------------------------------------------

/**
 * Build a JWKS fixture whose kid does NOT match the signing key so
 * every verify attempt triggers the kid_mismatch refetch branch.
 */
async function buildMismatchFixture(): Promise<{
  goodJwks: JSONWebKeySet;
  mismatchJwks: JSONWebKeySet;
  signJwt: (overrides?: Partial<Record<string, unknown>>) => Promise<string>;
}> {
  const { jwks: goodJwks, signJwt } = await buildSharedJwks();
  // A JWKS with a *different* kid — so our token's kid never matches.
  // The spread preserves all JWK fields; kty is always present for RSA keys.
  const baseKey = goodJwks.keys[0] as Required<(typeof goodJwks.keys)[0]>;
  const mismatchJwks: JSONWebKeySet = {
    keys: [{ ...baseKey, kid: "wrong-kid" }],
  };
  return { goodJwks, mismatchJwks, signJwt };
}

describe("#45: JWKS refetch rate-limit — two kid_mismatch requests within 30s share one fetch", () => {
  beforeEach(() => {
    __resetJwksCacheForTests();
  });

  it("triggers only ONE underlying JWKS fetch for two rapid kid_mismatch tokens", async () => {
    const { mismatchJwks, signJwt } = await buildMismatchFixture();

    let fetchCount = 0;
    const fetchJwks = jest.fn(async () => {
      fetchCount++;
      return mismatchJwks; // always return a mismatching JWKS
    });

    const app = buildApp(fetchJwks);
    const token = await signJwt();

    // First request: warms cache (fetch #1) + kid_mismatch triggers refetch (fetch #2)
    await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Second request within 30s: should NOT trigger a new refetch
    await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Initial warm + one refetch on the first mismatch = 2 total.
    // The second request must NOT add another refetch.
    expect(fetchCount).toBeLessThanOrEqual(2);
  });
});

describe("#45: JWKS refetch rate-limit — 100 concurrent kid_mismatch requests share ≤1 refetch", () => {
  beforeEach(() => {
    __resetJwksCacheForTests();
  });

  it("resolves 100 concurrent kid_mismatch requests with ≤ 1 in-flight refetch", async () => {
    const { mismatchJwks, signJwt } = await buildMismatchFixture();

    let refetchCount = 0;
    // The cache is cold. Each call to fetchJwks is either the initial warm or a refetch.
    // We track calls after the first (warm) one as "refetches".
    let callCount = 0;
    const fetchJwks = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        // Initial warm: return a JWKS with a mismatching kid so all requests
        // immediately hit kid_mismatch and attempt a refetch.
        return mismatchJwks;
      }
      refetchCount++;
      return mismatchJwks; // refetch also returns mismatch — token stays invalid
    });

    const app = buildApp(fetchJwks);
    const token = await signJwt();

    // Fire 100 concurrent requests. The first one warms the cache and discovers
    // kid_mismatch. All 100 (racing) should share a single refetch promise.
    const requests = Array.from({ length: 100 }, () =>
      app.request("/protected", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    await Promise.all(requests);

    // 1 warm call + at most 1 refetch = callCount ≤ 2, refetchCount ≤ 1.
    expect(refetchCount).toBeLessThanOrEqual(1);
  });
});

describe("#45: JWKS refetch rate-limit — after 30s a new kid_mismatch triggers a fresh fetch", () => {
  beforeEach(() => {
    __resetJwksCacheForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows a new refetch after the 30s cooldown expires", async () => {
    const { mismatchJwks, signJwt } = await buildMismatchFixture();

    let refetchCount = 0;
    let callCount = 0;
    const fetchJwks = jest.fn(async () => {
      callCount++;
      if (callCount === 1) return mismatchJwks; // warm
      refetchCount++;
      return mismatchJwks; // refetch always returns same mismatching JWKS
    });

    const app = buildApp(fetchJwks);
    const token = await signJwt();

    // First request: warm + first refetch
    await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const refetchAfterFirst = refetchCount;

    // Advance 30s + 1ms past the cooldown
    jest.advanceTimersByTime(30_001);

    // Second kid_mismatch should now be allowed to refetch
    await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(refetchCount).toBeGreaterThan(refetchAfterFirst);
  });
});
