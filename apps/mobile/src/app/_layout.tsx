import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../providers/AppProviders';
import { DESIGN_TOKENS } from '@money-matters/ui';

/**
 * Root Expo Router layout.
 * Wraps the entire navigation tree with AppProviders (tRPC + React Query).
 * All gesture/safe-area infrastructure is handled by expo-router internally.
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor={DESIGN_TOKENS.colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
