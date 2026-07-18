import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

const NEON_AUTH_URL = process.env["NEXT_PUBLIC_NEON_AUTH_URL"];

if (!NEON_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_NEON_AUTH_URL is not set.");
}

export const authClient = createAuthClient({
  baseURL: NEON_AUTH_URL,
  plugins: [
    jwtClient(),
  ],
});
