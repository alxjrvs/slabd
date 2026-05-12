/**
 * Shared JWK/JWT test helpers.
 *
 * Extracted so both clerk-auth.test.ts and me.test.ts can share the
 * same in-memory key generation logic without duplication.
 */

import { generateKeyPair, exportJWK, SignJWT } from "jose";
import type { JSONWebKeySet } from "jose";

export interface JwksFixture {
  jwks: JSONWebKeySet;
  signJwt: (overrides?: Partial<Record<string, unknown>>) => Promise<string>;
}

export async function buildJwks(): Promise<JwksFixture> {
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
