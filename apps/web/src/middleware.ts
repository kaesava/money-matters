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
  // Only run on protected paths — do NOT apply to _next static assets
  matcher: ["/dashboard/:path*", "/setup/:path*", "/subscription/:path*"],
};
