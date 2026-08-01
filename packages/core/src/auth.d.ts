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
/**
 * Verifies a Neon Auth (Better Auth) JWT and returns the raw identity claims.
 *
 * IMPORTANT: This function performs NO database queries and has NO dependency on
 * @money-matters/db. Tenant resolution (userId → tenantId) happens in the
 * API layer's createContext() after this call returns.
 *
 * Returns null if the token is missing, expired, or fails signature verification.
 */
export declare function verifyJwt(token: string): Promise<JwtClaims | null>;
//# sourceMappingURL=auth.d.ts.map