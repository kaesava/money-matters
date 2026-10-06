import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../../lib/format';

interface MatrixPaydaySummaryGridProps {
  readonly billsTotal: number;
  readonly goalsTotal: number;
  readonly everydayTotal: number;
}

export const MatrixPaydaySummaryGrid: React.FC<MatrixPaydaySummaryGridProps> = ({
  billsTotal,
  goalsTotal,
  everydayTotal,
}) => {
  return (
    <View style={styles.breakdownGrid}>
      <View style={styles.breakdownItem}>
        <Text style={styles.breakdownItemLabel}>📅 Bills</Text>
        <Text style={styles.breakdownItemVal}>{formatAUD(billsTotal)}</Text>
      </View>

      <View style={styles.breakdownItem}>
        <Text style={styles.breakdownItemLabel}>🎯 Goals</Text>
        <Text style={styles.breakdownItemVal}>{formatAUD(goalsTotal)}</Text>
      </View>

      <View style={styles.breakdownItem}>
        <Text style={styles.breakdownItemLabel}>☕ Everyday</Text>
        <Text style={styles.breakdownItemVal}>{formatAUD(everydayTotal)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  breakdownGrid: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  breakdownItemVal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
    marginTop: 2,
  },
});
