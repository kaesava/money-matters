import { NextRequest, NextResponse } from "next/server";

// Paths that are accessible without authentication
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth-callback",
  "/dev-callback/",
  "/reset-password",
  "/invite/",
  "/api/",
  "/subscription/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Global feature flag check: block auth and app access when auth is disabled
  const isAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false";

  if (!isAuthEnabled && pathname !== "/") {
    const landingUrl = new URL("/", request.url);
    return NextResponse.redirect(landingUrl);
  }

  // Bypass session cookie check if session verifier is present (let client SDK handle it)
  if (request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    return NextResponse.next();
  }

  // Allow root landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Allow all public paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Check for Neon Auth / Better Auth session cookies
  const sessionCookie =
    request.cookies.get("__Secure-neon-auth.session_token") ??
    request.cookies.get("neon-auth.session_token") ??
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("session_token") ??
    request.cookies.get("__Secure-session_token") ??
    request.cookies.get("neon_auth_session") ??
    request.cookies.get("session") ??
    request.cookies.get("__Secure-session");

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to app routes, sign-in, and sign-up (excluding static assets)
  matcher: ["/dashboard/:path*", "/setup/:path*", "/subscription/:path*", "/sign-in", "/sign-up"],
};
