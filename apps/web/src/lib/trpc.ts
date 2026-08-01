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
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // In production on Cloudflare Workers, target api.moneymatters.kaesava.au directly
    if (host === "moneymatters.kaesava.au") {
      return "https://api.moneymatters.kaesava.au";
    }
    // In local dev, use relative /api endpoint so requests hit Next.js proxy route regardless of Web port
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api";
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    if (cleanUrl.endsWith("/trpc")) {
      cleanUrl = cleanUrl.slice(0, -5);
    }
    return cleanUrl;
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
