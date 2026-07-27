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

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "https://api.moneymatters.kaesava.au/trpc",
        fetch(url, options) {
          return fetch(url, {
            ...options,
            // CRITICAL: Tells the browser to send HTTP-only cookies across subdomains
            credentials: "include", 
          });
        },
      }),
    ],
  });
}
