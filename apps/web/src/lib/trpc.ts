/**
 * Web Application tRPC Client Instantiation
 * 
 * Provides type-safe React Query hooks and custom httpBatchLink network layer configured with
 * 10-second request timeout guards and localStorage bearer token injection.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";

/** Type-safe React Query hooks bound to full-stack tRPC AppRouter definitions. */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Builds configured tRPC client instance with fetch timeout handling and auth header binding.
 *
 * @returns Configured tRPC client instance
 */
export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc", // proxied through Next.js dynamic routing to avoid CORS
        fetch: async (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
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
          const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
          if (!token) return {};
          return {
            Authorization: `Bearer ${token}`,
          };
        },
      }),
    ],
  });
}

