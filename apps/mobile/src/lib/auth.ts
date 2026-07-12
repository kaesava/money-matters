import { createAuthClient } from "@better-auth/expo/client";

const NEON_AUTH_URL = process.env["EXPO_PUBLIC_NEON_AUTH_URL"];

if (!NEON_AUTH_URL) {
  throw new Error(
    "EXPO_PUBLIC_NEON_AUTH_URL is not set. Add it to apps/mobile/.env.development"
  );
}

/**
 * Better Auth / Neon Auth client for React Native (Expo).
 *
 * Wraps @better-auth/expo to handle:
 *  - Native secure token storage (Expo SecureStore)
 *  - Session persistence across app restarts
 *  - Automatic token refresh
 */
export const authClient = createAuthClient({
  baseURL: NEON_AUTH_URL,
});
