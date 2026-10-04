import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface PoolData {
  id: string;
  name: string;
  poolType: string;
  currentBalance: number | string;
  isSurplusTarget?: boolean | null;
}

interface BankAccountData {
  id: string;
  name: string;
}

interface CategoryDetailPoolCardProps {
  pool: PoolData;
  bankAccount?: BankAccountData;
}

export function CategoryDetailPoolCard({ pool, bankAccount }: CategoryDetailPoolCardProps) {
  return (
    <View style={styles.poolSummaryCard}>
      <View style={styles.poolSummaryHeader}>
        <View style={styles.flex1}>
          <View style={styles.tagsRow}>
            <Text style={styles.poolTypeTag}>{pool.poolType}</Text>
            {pool.isSurplusTarget && (
              <View style={styles.surplusPill}>
                <Text style={styles.surplusPillText}>{t('categories.surplusBadgeText')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.poolNameTitle}>{pool.name}</Text>
          {bankAccount && <Text style={styles.bankNameMeta}>{bankAccount.name}</Text>}
        </View>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>{t('common.balance')}</Text>
          <Text style={styles.balanceAmount}>{formatAUD(pool.currentBalance)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  poolSummaryCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 16,
  },
  poolSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  poolTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[300],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  surplusPill: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  poolNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  bankNameMeta: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  balanceCol: { alignItems: 'flex-end' },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
