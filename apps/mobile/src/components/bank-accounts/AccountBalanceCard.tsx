import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AmountInput } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface AccountBalanceCardProps {
  balance: string;
  buffer: string;
  availableToBudget: number;
  isNegativeAvailable: boolean;
  linkedPoolsTotal: number;
  hasVariance: boolean;
  diffBeforeSave: number;
  linkedPoolsCount: number;
  onBalanceChange: (val: string) => void;
  onBufferChange: (val: string) => void;
}

export function AccountBalanceCard({
  balance,
  buffer,
  availableToBudget,
  isNegativeAvailable,
  linkedPoolsTotal,
  hasVariance,
  diffBeforeSave,
  linkedPoolsCount,
  onBalanceChange,
  onBufferChange,
}: AccountBalanceCardProps) {
  return (
    <>
      <AmountInput
        label={`${t('modals.reconciliation.actualBalance')} ($ AUD)`}
        required
        value={balance}
        onChangeText={onBalanceChange}
        placeholder="0.00"
      />

      <AmountInput
        label="Unbudgeted Buffer ($ AUD)"
        value={buffer}
        onChangeText={onBufferChange}
        placeholder="0.00"
        hint="Protected buffer ring-fenced from pool allocations."
      />

      {/* Live Available to Budget & Variance Card */}
      <View style={styles.varianceCard}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.availableToBudget')}:</Text>
          <Text style={[styles.metricVal, isNegativeAvailable ? styles.textNegative : styles.textPositive]}>
            {formatAUD(availableToBudget)}
          </Text>
        </View>

        {linkedPoolsCount > 0 && (
          <View style={styles.metricRowBorder}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.expectedTotal')}:</Text>
            <Text style={styles.metricVal}>{formatAUD(linkedPoolsTotal)}</Text>
          </View>
        )}

        {linkedPoolsCount > 0 && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.difference')}:</Text>
            <Text style={[styles.metricValBold, hasVariance ? (diffBeforeSave > 0 ? styles.textPositive : styles.textWarning) : styles.textPositive]}>
              {hasVariance
                ? (diffBeforeSave > 0 ? `+${formatAUD(diffBeforeSave)} surplus` : `-${formatAUD(Math.abs(diffBeforeSave))} shortfall`)
                : '✓ Balanced'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  varianceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metricVal: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1B2B4B',
  },
  metricValBold: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  textPositive: {
    color: '#059669',
  },
  textWarning: {
    color: '#D97706',
  },
  textNegative: {
    color: '#E11D48',
  },
});
