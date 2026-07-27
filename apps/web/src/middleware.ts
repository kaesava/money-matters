import { NextRequest, NextResponse } from "next/server";

// Paths that are accessible without authentication
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth-callback",
  "/reset-password",
  "/invite/",
  "/api/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow root landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Allow all public paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Check for Better Auth / Neon Auth session cookies
  // Better Auth sets one of these cookie names depending on whether it's HTTPS
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("neon_auth_session");

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on protected paths — do NOT apply to _next static assets
  matcher: ["/dashboard/:path*", "/setup/:path*"],
};
