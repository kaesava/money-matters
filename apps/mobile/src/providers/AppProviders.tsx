import React, { useState, useMemo } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { NotificationServiceProvider } from '@money-matters/capability-notifications/mobile';
import { IconVisibilityProvider, MobileToastProvider, MobileToastContainer } from '@money-matters/ui/mobile';
import { setLanguage, SupportedLanguage } from '@money-matters/i18n';
import { setMobileLocaleConfig } from '../lib/format';
import { posthog } from '../config/posthog';

interface AppProvidersProps {
  children: React.ReactNode;
}

function MobilePreferencesSync({ children }: { children: React.ReactNode }) {
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const pref = userPrefQuery.data;
  const showIcons = pref?.showIcons ?? true;

  React.useEffect(() => {
    if (pref) {
      const language = (pref.language as SupportedLanguage) || 'en';
      setLanguage(language);

      let resolvedLocale = pref.locale || 'auto';
      if (resolvedLocale === 'auto') {
        resolvedLocale = language === 'ja' ? 'ja-JP' : 'en-AU';
      }
      const timezone = pref.tenantTimezone || pref.timezone || 'Australia/Sydney';
      const userTimezone = pref.timezone || timezone;
      const currency = pref.currency || 'AUD';

      setMobileLocaleConfig({
        locale: resolvedLocale,
        timezone: userTimezone,
        currency,
      });
    }
  }, [pref]);

  return (
    <IconVisibilityProvider initialShowIcons={showIcons}>
      {children}
    </IconVisibilityProvider>
  );
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
            retry: (failureCount, error) => {
              if (
                error instanceof Error &&
                (error.message.includes('UNAUTHORIZED') ||
                  error.message.includes('FORBIDDEN') ||
                  error.message.includes('Authentication required'))
              ) {
                return false;
              }
              return failureCount < 2;
            },
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
            <MobilePreferencesSync>
              <MobileToastProvider>
                {children}
                <MobileToastContainer />
              </MobileToastProvider>
            </MobilePreferencesSync>
          </NotificationServiceProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </PostHogProvider>
  );
}
