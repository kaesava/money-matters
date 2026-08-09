/**
 * Web Application tRPC Client Instantiation
 *
 * All browser-side tRPC calls are routed through the Next.js relative /api/trpc
 * proxy route. This is critical: session cookies are scoped to the web origin
 * (moneymatters.kaesava.au) and browsers will NOT send them to a different
 * subdomain (api.moneymatters.kaesava.au). By always using /api/trpc the
 * cookie travels with the request to the Next.js Worker, which then reads it
 * server-side and forwards it (+ synthesises an Authorization header) to the
 * API Worker. Localhost dev is unchanged — it also uses /api/trpc.
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

function getBaseUrl() {
  // In the browser (both production and localhost), always use the relative
  // proxy path so cookies on the current origin are forwarded server-side.
  if (typeof window !== "undefined") {
    return "/api";
  }

  // SSR / server components: call the API directly.
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    if (cleanUrl.endsWith("/trpc")) {
      cleanUrl = cleanUrl.slice(0, -5);
    }
    return cleanUrl;
  }

  return "http://localhost:3001";
}

export function buildTrpcClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        // credentials: "include" sends cookies on same-origin /api/trpc requests
        fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
      }),
    ],
  });
}
