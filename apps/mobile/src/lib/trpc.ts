import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/routers/_app";
import { authClient } from "./auth";

// Re-export the typed tRPC hook factory — consumed across all screens
export const trpc = createTRPCReact<AppRouter>();

// Default local dev API URL — override via EXPO_PUBLIC_API_URL env var
const API_BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000";

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        async headers() {
          // Retrieve the current session token from Better Auth secure storage.
          // Returns null/undefined if the user is not signed in.
          const { data: session } = await authClient.getSession();
          if (!session?.session?.token) return {};
          return {
            Authorization: `Bearer ${session.session.token}`,
          };
        },
      }),
    ],
  });
}
