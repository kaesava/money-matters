import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { NotificationServiceProvider } from '@money-matters/capability-notifications/mobile';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Root provider tree for the mobile app.
 * Wraps all screens with tRPC + React Query contexts.
 *
 * Architecture note: queryClient and trpcClient are created once via useState
 * so they are stable across renders without requiring a global singleton or
 * module-level side-effect. This pattern is safe with React 19's strict mode.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 30, // 30s
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  const [trpcClient] = useState(() => buildTrpcClient());

  const notificationServiceValue = {
    useRegisterToken: () => trpc.registerToken.useMutation,
  };

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <NotificationServiceProvider value={notificationServiceValue}>
          {children}
        </NotificationServiceProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
