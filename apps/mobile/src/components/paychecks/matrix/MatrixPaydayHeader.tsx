import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { MatrixPaydayColumn } from '../MatrixPaydayCard';

interface MatrixPaydayHeaderProps {
  readonly item: MatrixPaydayColumn;
  readonly index: number;
  readonly isConfirmed: boolean;
  readonly isSaved: boolean;
  readonly isDeficit: boolean;
  readonly surplusAmount: number;
}

export const MatrixPaydayHeader: React.FC<MatrixPaydayHeaderProps> = ({
  item,
  index,
  isConfirmed,
  isSaved,
  isDeficit,
  surplusAmount,
}) => {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.badgeRow}>
          <Text style={styles.cycleBadge}>
            {t('matrix.paydayCycle', { index: index + 1 })}
          </Text>
          {isConfirmed ? (
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText}>{t('matrix.confirmedBadge')}</Text>
            </View>
          ) : isSaved ? (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>{t('matrix.savedBadge')}</Text>
            </View>
          ) : null}
          {isDeficit ? (
            <View style={styles.deficitBadge}>
              <Text style={styles.deficitText}>
                {t('matrix.deficitPrefix', { amount: formatAUD(Math.abs(surplusAmount)) })}
              </Text>
            </View>
          ) : (
            <View style={styles.surplusBadge}>
              <Text style={styles.surplusText}>
                {t('matrix.surplusPrefix', { amount: formatAUD(surplusAmount) })}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.payDate}>
          {item.date ? formatDate(item.date) : item.dateLabel || ''}
        </Text>
        <Text style={styles.sourceName}>{item.sourceName || ''}</Text>
      </View>

      <View style={styles.incomeCol}>
        <Text style={styles.incomeLabel}>{t('matrix.netPayLabel')}</Text>
        <Text style={styles.incomeAmount}>{formatAUD(item.totalIncome)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  cycleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  confirmedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  savedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  surplusBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  deficitBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deficitText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  payDate: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  sourceName: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  incomeCol: {
    alignItems: 'flex-end',
  },
  incomeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
  },
  incomeAmount: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.accent,
  },
});
