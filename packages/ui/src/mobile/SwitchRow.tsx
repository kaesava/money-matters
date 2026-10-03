import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
}: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: DESIGN_TOKENS.colors.border,
          true: DESIGN_TOKENS.colors.primary,
        }}
        thumbColor={DESIGN_TOKENS.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DESIGN_TOKENS.colors.border,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
