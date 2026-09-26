import React, { useState, useMemo } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { trpc, buildTrpcClient } from '../lib/trpc';
import { authClient } from '../lib/auth';
import { NotificationServiceProvider } from '@money-matters/capability-notifications/mobile';
import { IconVisibilityProvider, MobileToastProvider, MobileToastContainer, DateLocaleProvider } from '@money-matters/ui/mobile';
import { setLanguage, SupportedLanguage } from '@money-matters/i18n';
import { setMobileLocaleConfig } from '../lib/format';
import { posthog } from '../config/posthog';

interface AppProvidersProps {
  children: React.ReactNode;
}

function MobilePreferencesSync({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
    staleTime: 60_000,
  });
  const pref = userPrefQuery.data;
  const showIcons = pref?.showIcons ?? true;

  const resolvedLocale = React.useMemo(() => {
    let loc = pref?.locale || 'auto';
    return loc === 'auto' ? 'en-AU' : loc;
  }, [pref?.locale]);

  const userTimezone = pref?.timezone || pref?.tenantTimezone || 'Australia/Sydney';

  React.useEffect(() => {
    if (pref) {
      const language = (pref.language as SupportedLanguage) || 'en';
      setLanguage(language);

      const currency = pref.currency || 'AUD';

      setMobileLocaleConfig({
        locale: resolvedLocale,
        timezone: userTimezone,
        currency,
      });
    }
  }, [pref, resolvedLocale, userTimezone]);

  return (
    <DateLocaleProvider locale={resolvedLocale} timeZone={userTimezone}>
      <IconVisibilityProvider initialShowIcons={showIcons}>
        {children}
      </IconVisibilityProvider>
    </DateLocaleProvider>
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
    <SafeAreaProvider>
      <PostHogProvider
        client={posthog}
        autocapture={false}
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
    </SafeAreaProvider>
  );
}
