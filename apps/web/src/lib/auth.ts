import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

const NEON_AUTH_URL = process.env["NEXT_PUBLIC_NEON_AUTH_URL"];

if (!NEON_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_NEON_AUTH_URL is not set.");
}

// Route through first-party proxy in browser to allow secure cookie storage, 
// fallback to absolute URL during SSR / Node.js builds.
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return NEON_AUTH_URL;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    jwtClient(),
  ],
});
