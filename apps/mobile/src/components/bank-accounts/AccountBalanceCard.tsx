import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AmountInput, InfoTooltip } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface AccountBalanceCardProps {
  balance: string;
  buffer: string;
  availableToBudget: number;
  isNegativeAvailable: boolean;
  onBalanceChange: (val: string) => void;
  onBufferChange: (val: string) => void;
}

export function AccountBalanceCard({
  balance,
  buffer,
  availableToBudget,
  isNegativeAvailable,
  onBalanceChange,
  onBufferChange,
}: AccountBalanceCardProps) {
  return (
    <>
      <AmountInput
        label={`${t('settings.bankAccountForm.balanceLabel')} ($ AUD)`}
        required
        value={balance}
        onChangeText={onBalanceChange}
        placeholder="0.00"
      />

      <AmountInput
        label={t('settings.bankAccountForm.bufferLabel')}
        value={buffer}
        onChangeText={onBufferChange}
        placeholder="0.00"
      />

      {/* Available to Budget */}
      <View style={styles.availableCard}>
        <View style={styles.metricRow}>
          <View style={styles.labelWithTooltip}>
            <Text style={styles.metricLabel}>{t('settings.bankAccountForm.availableLabel')}</Text>
            <InfoTooltip content={t('settings.bankAccountForm.availableTooltip')} />
          </View>
          <Text style={[styles.metricVal, isNegativeAvailable ? styles.textNegative : styles.textPositive]}>
            {formatAUD(availableToBudget)}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  availableCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelWithTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  metricVal: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  textPositive: {
    color: '#059669',
  },
  textNegative: {
    color: '#E11D48',
  },
});
