import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { MobileIncomeItem } from '../MobileNextPaydayCard';

interface NextPaydayIncomeItemProps {
  readonly item: MobileIncomeItem;
  readonly isEarliest: boolean;
  readonly daysAwayText: string;
  readonly isOverdue: boolean;
  readonly onPressRunSplit: (eventId: string) => void;
  readonly onDeletePress: (item: MobileIncomeItem) => void;
}

export const NextPaydayIncomeItem: React.FC<NextPaydayIncomeItemProps> = ({
  item,
  isEarliest,
  daysAwayText,
  isOverdue,
  onPressRunSplit,
  onDeletePress,
}) => {
  const isSaved = item.isSaved || item.status === 'DRAFT' || item.status === 'SAVED';

  return (
    <View style={styles.incomeItemCard}>
      <View style={styles.incomeInfo}>
        <View style={styles.incomeTopRow}>
          <Text style={styles.incomeName} numberOfLines={1}>
            {item.name}
          </Text>
          {isEarliest && (
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>
                {t('dashboard.nextPay.nextPaydayBadge')}
              </Text>
            </View>
          )}
          {isSaved && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>
                {t('dashboard.nextPay.savedBadge')}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.incomeMeta}>
          <Text style={styles.incomeAmount}>{formatAUD(item.amount)}</Text>
          {' · '}
          <Text style={isOverdue ? styles.overdueText : styles.daysAwayText}>
            {daysAwayText}
          </Text>
          {' '}({formatDate(item.expectedDate)})
        </Text>

        {item.bankAccountName ? (
          <Text style={styles.bankAccountText}>
            {item.bankAccountName}
            {item.availableToBudget !== undefined && item.availableToBudget !== null && (
              <>
                {' · '}
                <Text style={styles.budgetAmount}>
                  {formatAUD(item.availableToBudget)}
                </Text>
                {' '}{t('dashboard.availableToBudget')}
              </>
            )}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={styles.splitBtn}
          onPress={() => onPressRunSplit(item.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.splitBtnText}>{t('common.runSplit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDeletePress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  incomeItemCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  incomeInfo: {
    flex: 1,
    gap: 3,
  },
  incomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  incomeName: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  nextBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  nextBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
    textTransform: 'uppercase',
  },
  savedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: DESIGN_TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  savedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
    textTransform: 'uppercase',
  },
  incomeMeta: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  incomeAmount: {
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  daysAwayText: {
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  overdueText: {
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  bankAccountText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  budgetAmount: {
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  splitBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.default,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  splitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
