import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AmountInput, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';

export interface ReconcilePoolItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance: number;
  isSurplusTarget?: boolean | null;
}

export interface ReconciliationPoolRowProps {
  pool: ReconcilePoolItem;
  value: string;
  onChange: (val: string) => void;
  isSurplus: boolean;
  autoFocus?: boolean;
}

export function ReconciliationPoolRow({
  pool,
  value,
  onChange,
  isSurplus,
  autoFocus,
}: ReconciliationPoolRowProps) {
  const isEveryday = pool.poolType === 'EVERYDAY';
  const maxAvailable = pool.currentBalance;

  const handleTextChange = (text: string) => {
    if (!text) {
      onChange('');
      return;
    }
    const num = parseFloat(text) || 0;
    if (!isSurplus && !isEveryday && num > maxAvailable) {
      onChange(maxAvailable.toFixed(2));
      return;
    }
    onChange(text);
  };

  const badgeStyle = isEveryday
    ? styles.badgeEveryday
    : pool.poolType === 'REGULAR'
    ? styles.badgeBills
    : styles.badgeGoals;

  return (
    <View style={styles.card}>
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{pool.name}</Text>
          {pool.isSurplusTarget && (
            <View style={styles.sweepBadge}>
              <Text style={styles.sweepBadgeText}>
                {t('bankAccounts.reconcile.sweepGoalBadge')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, badgeStyle]}>
            <Text style={styles.typeText}>
              {pool.poolType === 'EVERYDAY'
                ? t('poolTypes.everyday')
                : pool.poolType === 'REGULAR'
                ? t('poolTypes.bills')
                : t('poolTypes.goals')}
            </Text>
          </View>
          <Text style={styles.availText}>
            {t('bankAccounts.reconcile.tableAvailable')}: {formatAUD(pool.currentBalance)}
          </Text>
        </View>
      </View>

      <View style={styles.inputCol}>
        <AmountInput
          label={t('bankAccounts.reconcile.tableAdjustment')}
          value={value}
          onChangeText={handleTextChange}
          placeholder="0.00"
          autoFocus={autoFocus}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    gap: 8,
  },
  infoCol: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  sweepBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sweepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeEveryday: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
  },
  badgeBills: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  badgeGoals: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  availText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  inputCol: {
    marginTop: 2,
  },
});
