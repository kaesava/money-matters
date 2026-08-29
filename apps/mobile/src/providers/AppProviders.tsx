import React, { useState } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { NotificationServiceProvider } from '@money-matters/capability-notifications/mobile';
import { IconVisibilityProvider, MobileToastProvider, MobileToastContainer } from '@money-matters/ui/mobile';
import { posthog } from '../config/posthog';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            const errStr = String((error as Error)?.message || error);
            if (
              errStr.includes("fetch failed") ||
              errStr.includes("NetworkError") ||
              errStr.includes("500") ||
              errStr.includes("502") ||
              errStr.includes("503") ||
              errStr.includes("Database")
            ) {
              console.warn("[Mobile Query Error]: Server or database unreachable", errStr);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            const errStr = String((error as Error)?.message || error);
            console.warn("[Mobile Mutation Error]: Mutation failed", errStr);
          },
        }),
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
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false, // Manual screen tracking via expo-router in _layout.tsx
        captureTouches: true,
        propsToCapture: ['testID'],
        maxElementsCaptured: 20,
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <NotificationServiceProvider value={notificationServiceValue}>
            <IconVisibilityProvider>
              <MobileToastProvider>
                {children}
                <MobileToastContainer />
              </MobileToastProvider>
            </IconVisibilityProvider>
          </NotificationServiceProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </PostHogProvider>
  );
}
