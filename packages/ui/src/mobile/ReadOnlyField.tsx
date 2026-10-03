import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  placeholder?: string;
}

export function ReadOnlyField({
  label,
  value,
  placeholder = '—',
}: ReadOnlyFieldProps) {
  const displayVal = value !== null && value !== undefined && value !== '' ? String(value) : placeholder;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayVal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DESIGN_TOKENS.colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
});
