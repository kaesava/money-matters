import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface FormErrorBannerProps {
  message?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function FormErrorBanner({ message, style }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <Feather name="alert-circle" size={16} color={DESIGN_TOKENS.colors.burnRed} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: D.colors.burnRed,
    borderRadius: D.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: D.colors.burnRed,
  },
});

export default FormErrorBanner;
