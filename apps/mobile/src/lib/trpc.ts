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

export function getActiveTenantId(): string | null {
  return activeTenantId;
}

export async function switchActiveTenant(
  tenantId: string,
  queryClientOrUtils?: {
    invalidateQueries?: () => Promise<unknown> | void;
    resetQueries?: () => Promise<unknown> | void;
    invalidate?: () => Promise<unknown> | void;
  }
) {
  setActiveTenantId(tenantId);
  if (queryClientOrUtils) {
    if (typeof queryClientOrUtils.resetQueries === 'function') {
      await queryClientOrUtils.resetQueries();
    }
    if (typeof queryClientOrUtils.invalidate === 'function') {
      await queryClientOrUtils.invalidate();
    } else if (typeof queryClientOrUtils.invalidateQueries === 'function') {
      await queryClientOrUtils.invalidateQueries();
    }
  }
}

import { Platform } from "react-native";

const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env["NODE_ENV"] !== "production";
const FUNNEL_API_URL = "https://kesh-imac.tail09ef18.ts.net";
const PROD_API_URL = "https://api.moneymatters.kaesava.au";

function resolveApiBaseUrl(): string {
  const envUrl = process.env["EXPO_PUBLIC_API_URL"];
  if (Platform.OS !== "web") {
    // Physical mobile devices cannot reach localhost or 127.0.0.1 over wireless/tunnel.
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return isDev ? FUNNEL_API_URL : PROD_API_URL;
    }
  }
  return envUrl || (isDev ? FUNNEL_API_URL : PROD_API_URL);
}

const API_BASE_URL = resolveApiBaseUrl();

export async function getStoredTokenAndCookie(): Promise<{ token: string | null; cookie: string | null }> {
  let token: string | null = null;
  let cookie: string | null = null;

  try {
    const directToken =
      (await SecureStore.getItemAsync("money-matters_session_token")) ||
      (await SecureStore.getItemAsync("money-matters-session-token"));
    if (directToken) {
      token = directToken;
    }
  } catch {
    // Ignore storage read failures for optional cached tokens
  }

  // Fallback: Check Better Auth session cache saved by expoClient plugin
  if (!token) {
    try {
      const sessionDataStr = await SecureStore.getItemAsync("money-matters_session_data");
      if (sessionDataStr) {
        const parsed = JSON.parse(sessionDataStr) as { session?: { token?: string }; token?: string };
        const cachedToken = parsed?.session?.token || parsed?.token;
        if (cachedToken) {
          token = cachedToken;
        }
      }
    } catch {
      // Ignore cache parse failures
    }
  }

  try {
    const cookieStr = await SecureStore.getItemAsync("money-matters_cookie");
    if (cookieStr) {
      const parsed = JSON.parse(cookieStr) as Record<string, { value?: string }>;
      const cookieParts: string[] = [];
      for (const [key, obj] of Object.entries(parsed)) {
        if (obj?.value) {
          cookieParts.push(`${key}=${obj.value}`);
          if (!token && key.includes("session_token")) {
            // Strip any signature suffix and s: / s_ / s%3A prefix
            token = obj.value.split(".")[0].replace(/^(?:s:|s_|s%3A)/, "");
          }
        }
      }
      if (cookieParts.length > 0) {
        cookie = cookieParts.join("; ");
      }
    }
  } catch {
    // Ignore storage read failures for optional cached cookies
  }

  // Fallback: Query authClient.getCookie() if cookie header is not assembled
  if (!cookie) {
    try {
      const clientCookie = (authClient as unknown as { getCookie?: () => string }).getCookie?.();
      if (clientCookie) {
        cookie = clientCookie;
      }
    } catch {
      // Ignore
    }
  }

  // Asynchronous fallback: Query active session from Better Auth client
  if (!token) {
    try {
      const sessionRes = await authClient.getSession();
      const resolved = (sessionRes.data as { session?: { token?: string }; token?: string })?.session?.token || (sessionRes.data as { token?: string })?.token;
      if (resolved) {
        token = resolved;
        await SecureStore.setItemAsync("money-matters_session_token", resolved).catch(() => {});
        await SecureStore.setItemAsync("money-matters-session-token", resolved).catch(() => {});
      }
    } catch {
      // Ignore network / offline failure
    }
  }

  return { token, cookie };
}

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        fetch: async (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          try {
            let res = await fetch(url, {
              ...options,
              signal: controller.signal,
            });

            // 401 Unauthorized Interceptor: Attempt token refresh & single retry
            if (res.status === 401) {
              const { token: freshToken, cookie: freshCookie } = await getStoredTokenAndCookie();

              if (freshToken && freshToken !== activeSessionToken) {
                activeSessionToken = freshToken;
                const newHeaders: Record<string, string> = {
                  ...((options?.headers as Record<string, string>) || {}),
                  Authorization: `Bearer ${freshToken}`,
                };
                if (freshCookie) {
                  newHeaders["cookie"] = freshCookie;
                }
                res = await fetch(url, {
                  ...options,
                  headers: newHeaders,
                  signal: controller.signal,
                });
              }
            }

            clearTimeout(timeoutId);
            const contentType = res.headers.get("content-type");
            if (contentType && !contentType.includes("application/json") && !res.ok) {
              const text = await res.text();
              console.error(
                `[tRPC fetch error] Server returned HTTP ${res.status} non-JSON response from ${url}:`,
                text.slice(0, 300)
              );
            }
            return res;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
        async headers() {
          const { token: storedToken, cookie } = await getStoredTokenAndCookie();
          let token = activeSessionToken || storedToken;
          if (token && !activeSessionToken) {
            activeSessionToken = token;
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
          if (cookie) {
            headersObj["cookie"] = cookie;
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
