import { logger } from "./logger.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface AuthSession {
  userId: string;
  tenantId: string; // = householdId resolved by context layer
  appId: string;
  role: "OWNER" | "MEMBER";
  email: string;
}

export interface JwtClaims {
  userId: string;
  email: string;
  displayName?: string;
}

const NEON_AUTH_BASE_URL = process.env["NEON_AUTH_BASE_URL"];
const NEON_AUTH_JWKS_URL = process.env["NEON_AUTH_JWKS_URL"];

// Lazy-initialise the JWKS keyset once on first use.
// createRemoteJWKSet caches keys internally and auto-rotates on key ID miss.
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!NEON_AUTH_JWKS_URL) {
    throw new Error("NEON_AUTH_JWKS_URL environment variable is not set.");
  }
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL));
  }
  return _jwks;
}

/**
 * Verifies a Neon Auth (Better Auth) JWT and returns the raw identity claims.
 *
 * IMPORTANT: This function performs NO database queries and has NO dependency on
 * @money-matters/db. Tenant resolution (householdId → tenantId) happens in the
 * API layer's createContext() after this call returns.
 *
 * Returns null if the token is missing, expired, or fails signature verification.
 */
export async function verifyJwt(token: string): Promise<JwtClaims | null> {
  if (!token) return null;

  try {
    const issuer = NEON_AUTH_BASE_URL;
    if (!issuer) {
      throw new Error("NEON_AUTH_BASE_URL environment variable is not set.");
    }

    const { payload } = await jwtVerify(token, getJwks(), {
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
