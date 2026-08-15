import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const getBaseURL = () => {
  // 1. In browser runtime: always route through first-party proxy
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  
  // 2. In Node.js / SSG build phase: use env var or generic fallback to prevent build crashes
  return process.env["NEXT_PUBLIC_NEON_AUTH_URL"] || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [emailOTPClient()],
});
