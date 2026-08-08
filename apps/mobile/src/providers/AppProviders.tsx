import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { NotificationServiceProvider } from '@money-matters/capability-notifications/mobile';
import { IconVisibilityProvider } from '@money-matters/ui/mobile';
import { posthog } from '../config/posthog';

interface AppProvidersProps {
  children: React.ReactNode;
}

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
              {children}
            </IconVisibilityProvider>
          </NotificationServiceProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </PostHogProvider>
  );
}
