import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { jwtClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

const NEON_AUTH_URL = process.env["EXPO_PUBLIC_NEON_AUTH_URL"];

const API_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://kesh-imac.tail09ef18.ts.net";

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
  fetchOptions: {
    headers: {
      Origin: API_URL,
    },
  },
  plugins: [
    expoClient({
      scheme: "moneymatters",
      storage: SecureStore,
      storagePrefix: "money-matters",
    }),
    jwtClient(),
  ],
});

