import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../api/src/routers/_app';
import { getMockSession } from './mock-session';

// Re-export the typed tRPC hook factory — consumed across all screens
export const trpc = createTRPCReact<AppRouter>();

// Default local dev API URL — override via EXPO_PUBLIC_API_URL env var
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        headers() {
          // Forward the mock session as a Bearer token so tenantProcedure
          // can decode tenantId / appId / userId from the Context layer
          const session = getMockSession();
          return {
            Authorization: `Bearer ${session.token}`,
          };
        },
      }),
    ],
  });
}
