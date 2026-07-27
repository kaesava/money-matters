/**
 * Web Application tRPC Client Instantiation
 * 
 * Configured for cross-subdomain communication between moneymatters.kaesava.au 
 * and api.moneymatters.kaesava.au using cookie credentials.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"];
  if (!apiUrl) {
    // Falls back to root-relative path during local dev proxy or SSG build checks
    return "";
  }
  return apiUrl;
}

export function buildTrpcClient() {
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
