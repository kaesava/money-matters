import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

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
