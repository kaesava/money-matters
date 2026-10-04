import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

interface MarkPaidTargetPoolCardProps {
  poolName: string;
  poolType: string;
  poolBalance: number;
}

export function MarkPaidTargetPoolCard({
  poolName,
  poolType,
  poolBalance,
}: MarkPaidTargetPoolCardProps) {
  return (
    <View style={styles.poolCard}>
      <View>
        <Text style={styles.poolCardLabel}>Target Pool</Text>
        <Text style={styles.poolCardName}>
          {poolName} <Text style={styles.poolCardType}>({poolType})</Text>
        </Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.poolCardLabel}>Current Balance</Text>
        <Text style={styles.poolCardBal}>{formatAUD(poolBalance)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poolCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    padding: 12,
  },
  poolCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: DESIGN_TOKENS.colors.slate[500],
    marginBottom: 2,
  },
  poolCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  poolCardType: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  poolCardBal: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
});
