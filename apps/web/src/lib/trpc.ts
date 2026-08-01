/**
 * Web Application tRPC Client Instantiation
 * 
 * Configured for cross-subdomain communication between moneymatters.kaesava.au 
 * and api.moneymatters.kaesava.au using cookie credentials.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    if (cleanUrl.endsWith("/trpc")) {
      cleanUrl = cleanUrl.slice(0, -5);
    }
    return cleanUrl;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "moneymatters.kaesava.au") {
      return "https://api.moneymatters.kaesava.au";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }

  return "http://localhost:4000";
}

export function buildTrpcClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        async headers() {
          const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
