import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';

/**
 * Entry point route — immediately redirects based on auth + setup state.
 *
 * Decision tree:
 *   not authenticated → /(auth)/sign-in
 *   authenticated, no setup → /(setup)/income
 *   authenticated, setup done → /(app)/home
 */
export default function IndexRoute() {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const { data: status, isPending: statusPending, error } = trpc.getTenantStatus.useQuery(
    undefined,
    {
      enabled: !!session,
      retry: false,
    }
  );

  if (sessionPending || (session && statusPending)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (error || !status?.hasTenant) {
    return <Redirect href="/(setup)/income" />;
  }

  return <Redirect href="/(app)/home" />;
}
