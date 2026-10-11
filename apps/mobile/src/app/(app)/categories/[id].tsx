import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/(app)/envelopes/${id}` as never);
    } else {
      router.replace('/(app)/categories' as never);
    }
  }, [id, router]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
});
