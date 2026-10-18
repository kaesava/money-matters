/**
 * Canonical Security Headers conforming to AGENTS.md §2 and §10.
 * Enforces clickjacking prevention, MIME sniffing suppression, HSTS, and strict origin isolation.
 */
export const CANONICAL_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
