import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../providers/AppProviders';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { logger } from '../lib/logger';
import '../../global.css';

/**
 * Mobile Root Layout
 * Configures Sentry error monitoring and wraps application with AppProviders.
 */
export default function RootLayout() {
  React.useEffect(() => {
    logger.info("Mobile app initialized on Android.");
  }, []);

  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor={DESIGN_TOKENS.colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
