import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BankProviderBadge, CardDrawerIndicator, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';

export interface BankAccountCardHeaderProps {
  name: string;
  bankProvider?: string | null;
  isPrivate?: boolean;
  availBal: number;
  actualBal: number;
  buffer: number;
}

export function BankAccountCardHeader({
  name,
  bankProvider,
  isPrivate,
  availBal,
  actualBal,
  buffer,
}: BankAccountCardHeaderProps) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.titleCol}>
        <View style={styles.titleRow}>
          <BankProviderBadge provider={bankProvider} size="sm" />
          <Text style={styles.accountName} numberOfLines={1}>
            {name}
          </Text>
          {isPrivate && (
            <View style={styles.privatePill}>
              <Text style={styles.privateText}>{t('bankAccounts.privateBadge')}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.balWrap}>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceAmount}>{formatAUD(availBal)}</Text>
          <Text style={styles.actualBalance}>
            {t('bankAccounts.actualBalanceLabel', { amount: formatAUD(actualBal) })}
          </Text>
        </View>
        <CardDrawerIndicator size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  privatePill: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  balWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  actualBalance: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    fontWeight: '500',
    marginTop: 1,
  },
});
