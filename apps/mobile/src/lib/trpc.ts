import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";
import { authClient } from "./auth";

// Re-export the typed tRPC hook factory — consumed across all screens
export const trpc = createTRPCReact<AppRouter>();

// In-memory token cache to prevent race conditions during signup/login
let activeSessionToken: string | null = null;

export function setActiveSessionToken(token: string | null) {
  activeSessionToken = token;
}

import * as SecureStore from "expo-secure-store";

// Default local dev API URL — override via EXPO_PUBLIC_API_URL env var
const API_BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "https://kesh-imac.tail09ef18.ts.net";
const NEON_AUTH_URL = process.env["EXPO_PUBLIC_NEON_AUTH_URL"];

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        fetch: async (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          try {
            const res = await fetch(url, {
              ...options,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return res;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        async headers() {
          console.log(`[DEBUG client trpc] headers() builder invoked. activeSessionToken:`, activeSessionToken ? "cached" : "empty");
          let token = activeSessionToken;
          
          if (!token) {
            // Retrieve the stored session token manually from SecureStore (check both underscore and hyphen keys)
            const sessionToken = await SecureStore.getItemAsync("money-matters_session_token") || 
                                 await SecureStore.getItemAsync("money-matters-session-token");
            console.log(`[DEBUG client trpc] Stored session token:`, sessionToken ? "found" : "not found");
            if (sessionToken) {
              token = sessionToken;
              activeSessionToken = token;
            }
          }
          
          if (!token) {
            console.log(`[DEBUG client trpc] No session token available. Sending empty headers.`);
            return {};
          }
          
          console.log(`[DEBUG client trpc] Sending Authorization Bearer token.`);
          return {
            Authorization: `Bearer ${token}`,
          };
        },
      }),
    ],
  });
}
