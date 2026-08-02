import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../providers/AppProviders';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { logger } from '../lib/logger';
import { posthog } from '../config/posthog';
import '../../global.css';
import * as Sentry from "@sentry/react-native";


Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__, // Enables error logging in production/standalone builds
});
export default Sentry.wrap(RootLayout);


/**
 * Mobile Root Layout
 * Configures Sentry error monitoring and wraps application with AppProviders.
 */
function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    logger.info("Mobile app initialized on Android.");
  }, []);

  // Manual screen tracking for expo-router
  // @see https://posthog.com/docs/libraries/react-native#screen-tracking
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor={DESIGN_TOKENS.colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
