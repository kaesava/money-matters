import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../../lib/format';

interface SplitPoolGroupHeaderProps {
  label: string;
  totalSum: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SplitPoolGroupHeader: React.FC<SplitPoolGroupHeaderProps> = ({
  label,
  totalSum,
  isCollapsed,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.groupHeader}
      activeOpacity={0.7}
    >
      <View style={styles.groupHeaderLeft}>
        <Feather
          name={isCollapsed ? 'chevron-right' : 'chevron-down'}
          size={14}
          color={DESIGN_TOKENS.colors.textMuted}
        />
        <Text style={styles.groupLabel}>{label}</Text>
      </View>
      <Text style={styles.groupSum}>{formatAUD(totalSum)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  groupSum: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});
