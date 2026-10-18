import { logger } from "./logger.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface AuthSession {
  userId: string;
  tenantId: string;
  appId: string;
  role: "OWNER" | "MEMBER";
  email: string;
}

export interface JwtClaims {
  userId: string;
  email: string;
  displayName?: string;
}

// Lazy-initialise the JWKS keyset on first use per JWKS URL.
// createRemoteJWKSet caches keys internally and auto-rotates on key ID miss.
const _jwksMap = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(jwksUrl?: string): ReturnType<typeof createRemoteJWKSet> {
  const urlStr = jwksUrl || process.env["NEON_AUTH_JWKS_URL"];
  if (!urlStr) {
    throw new Error("NEON_AUTH_JWKS_URL environment variable is not set.");
  }
  let jwks = _jwksMap.get(urlStr);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(urlStr));
    _jwksMap.set(urlStr, jwks);
  }
  return jwks;
}

/**
 * Verifies a Neon Auth (Better Auth) JWT and returns the raw identity claims.
 *
 * IMPORTANT: This function performs NO database queries and has NO dependency on
 * @money-matters/db. Tenant resolution (userId → tenantId) happens in the
 * API layer's createContext() after this call returns.
 *
 * Returns null if the token is missing, expired, or fails signature verification.
 */
export async function verifyJwt(
  token: string,
  env?: { NEON_AUTH_BASE_URL?: string; NEON_AUTH_JWKS_URL?: string }
): Promise<JwtClaims | null> {
  if (!token) return null;

  try {
    const issuer = env?.NEON_AUTH_BASE_URL || process.env["NEON_AUTH_BASE_URL"];
    if (!issuer) {
      throw new Error("NEON_AUTH_BASE_URL environment variable is not set.");
    }

    const { payload } = await jwtVerify(token, getJwks(env?.NEON_AUTH_JWKS_URL), {
      issuer,
    });

    const userId = payload.sub;
    const email = payload["email"] as string | undefined;
    const name = payload["name"] as string | undefined;

    if (!userId || !email) return null;

    return { userId, email, displayName: name };
  } catch (err) {
    logger.debug("[verifyJwt] JWT Verification failed (expected for database session tokens): " + (err instanceof Error ? err.message : String(err)));
    return null;
  }
}
