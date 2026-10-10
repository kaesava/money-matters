import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(app)/transactions?tab=payday-allocations' as never);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
    </View>
  );
}
