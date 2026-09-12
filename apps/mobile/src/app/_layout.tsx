import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { AppProviders } from '../providers/AppProviders';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { logger } from '../lib/logger';
import { posthog } from '../config/posthog';
import {
  isBiometricLockEnabled,
  recordBackgroundTimestamp,
  shouldPromptBiometricLock,
} from '../lib/biometrics';
import { BiometricLockOverlay } from '../components/BiometricLockOverlay';
import '../../global.css';
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__, // Enables error logging in production/standalone builds
});
export default Sentry.wrap(RootLayout);

/**
 * Mobile Root Layout
 * Configures Sentry error monitoring, biometrics lock, PostHog telemetry, and wraps with AppProviders.
 */
function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    logger.info("Mobile app initialized on Android.");

    if (Platform.OS === 'android') {
      try {
        NavigationBar.setStyle('dark');
      } catch {
        // ignore
      }
    }

    // Check if biometric lock should be engaged on initial cold launch
    isBiometricLockEnabled().then((enabled) => {
      if (enabled && shouldPromptBiometricLock()) {
        setIsLocked(true);
      }
    }).catch(() => {});

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        recordBackgroundTimestamp();
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        isBiometricLockEnabled().then((enabled) => {
          if (enabled && shouldPromptBiometricLock()) {
            setIsLocked(true);
          }
        }).catch(() => {});
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
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
      {isLocked && <BiometricLockOverlay onUnlocked={() => setIsLocked(false)} />}
    </AppProviders>
  );
}

