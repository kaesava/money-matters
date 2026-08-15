import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";
import { authClient } from "./auth";

// Re-export the typed tRPC hook factory — consumed across all screens
export const trpc = createTRPCReact<AppRouter>();

import * as SecureStore from "expo-secure-store";

let activeSessionToken: string | null = null;
let activeTenantId: string | null = null;

export function setActiveSessionToken(token: string | null) {
  activeSessionToken = token;
}

export function setActiveTenantId(tenantId: string | null) {
  activeTenantId = tenantId;
  if (tenantId) {
    SecureStore.setItemAsync("money_matters_active_tenant_id", tenantId).catch(() => {});
  } else {
    SecureStore.deleteItemAsync("money_matters_active_tenant_id").catch(() => {});
  }
}

const API_BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "https://kesh-imac.tail09ef18.ts.net";

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
            const contentType = res.headers.get("content-type");
            if (contentType && !contentType.includes("application/json") && !res.ok) {
              const text = await res.text();
              console.error(`[tRPC fetch error] Server returned HTTP ${res.status} non-JSON response from ${url}:`, text.slice(0, 300));
            }
            return res;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        async headers() {
          let token = activeSessionToken;
          
          if (!token) {
            const sessionToken = await SecureStore.getItemAsync("money-matters_session_token") || 
                                 await SecureStore.getItemAsync("money-matters-session-token");
            if (sessionToken) {
              token = sessionToken;
              activeSessionToken = token;
            }
          }
          
          let tenantId = activeTenantId;
          if (!tenantId) {
            tenantId = await SecureStore.getItemAsync("money_matters_active_tenant_id");
            if (tenantId) activeTenantId = tenantId;
          }

          const headersObj: Record<string, string> = {};
          if (token) {
            headersObj["Authorization"] = `Bearer ${token}`;
          }
          if (tenantId) {
            headersObj["x-tenant-id"] = tenantId;
          }

          return headersObj;
        },
      }),
    ],
  });
}
