import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  CardDrawerIndicator,
  SwipeableCard,
} from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../../../lib/format';
import type { TimelineEventItem, PaycheckIncomeEvent, PaycheckExpenseEvent, PaycheckTransferEvent } from '../PaycheckEventSection';
import { PaycheckEventActionButtons } from './PaycheckEventActionButtons';
import { PaycheckEventEntityLink } from './PaycheckEventEntityLink';

interface PaycheckEventCardProps {
  readonly item: TimelineEventItem;
  readonly todayStr: string;
  readonly onOpenPaydayWizard: (eventId: string) => void;
  readonly onEditUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  readonly onDeleteUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  readonly onEditUpcomingExpense: (event: PaycheckExpenseEvent) => void;
  readonly onDeleteUpcomingExpense?: (event: PaycheckExpenseEvent) => void;
  readonly onMarkExpensePaid: (eventId: string, amount: string) => void;
  readonly onExecuteTransfer?: (event: PaycheckTransferEvent) => void;
  readonly onDeleteUpcomingTransfer?: (event: PaycheckTransferEvent) => void;
}

export const PaycheckEventCard: React.FC<PaycheckEventCardProps> = ({
  item,
  todayStr,
  onOpenPaydayWizard,
  onEditUpcomingIncome,
  onDeleteUpcomingIncome,
  onEditUpcomingExpense,
  onDeleteUpcomingExpense,
  onMarkExpensePaid,
  onExecuteTransfer,
  onDeleteUpcomingTransfer,
}) => {
  const isPast = item.expectedDate < todayStr;
  const isIncome = item.kind === 'INCOME';
  const isTransfer = item.kind === 'TRANSFER';
  const isExpense = item.kind === 'EXPENSE';

  const handleCardPress = () => {
    if (isIncome && item.rawIncome && onEditUpcomingIncome) {
      onEditUpcomingIncome(item.rawIncome);
    } else if (isExpense && item.rawExpense && onEditUpcomingExpense) {
      onEditUpcomingExpense(item.rawExpense);
    }
  };

  const handleSwipeDelete = () => {
    if (isIncome && onDeleteUpcomingIncome && item.rawIncome) {
      onDeleteUpcomingIncome(item.rawIncome);
    } else if (isExpense && onDeleteUpcomingExpense && item.rawExpense) {
      onDeleteUpcomingExpense(item.rawExpense);
    } else if (isTransfer && onDeleteUpcomingTransfer && item.rawTransfer) {
      onDeleteUpcomingTransfer(item.rawTransfer);
    }
  };

  return (
    <SwipeableCard
      key={`${item.kind}_${item.id}`}
      onSwipeDelete={handleSwipeDelete}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={handleCardPress}
      >
        <View style={styles.topRow}>
          <View style={styles.dateContainer}>
            <Text
              style={[
                styles.cardDate,
                isPast && styles.cardDateOverdue,
              ]}
            >
              {formatDate(item.expectedDate)}
            </Text>
            {isPast && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>
                  {t('common.overdue')}
                </Text>
              </View>
            )}
          </View>

          <CardDrawerIndicator size={16} color={DESIGN_TOKENS.colors.slate[400]} />
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.cardAmount,
              isIncome && styles.cardAmountIncome,
              isExpense && styles.cardAmountExpense,
              isTransfer && styles.cardAmountTransfer,
            ]}
          >
            {isIncome ? '+' : isTransfer ? '↔' : '−'}
            {formatAUD(item.expectedAmount)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <PaycheckEventEntityLink item={item} />
          <PaycheckEventActionButtons
            item={item}
            onOpenPaydayWizard={onOpenPaydayWizard}
            onMarkExpensePaid={onMarkExpensePaid}
            onExecuteTransfer={onExecuteTransfer}
          />
        </View>
      </TouchableOpacity>
    </SwipeableCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: 10,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  cardDateOverdue: {
    color: DESIGN_TOKENS.colors.critical,
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.criticalDark,
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    flex: 1,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  cardAmountIncome: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  cardAmountExpense: {
    color: DESIGN_TOKENS.colors.critical,
  },
  cardAmountTransfer: {
    color: DESIGN_TOKENS.colors.accent,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 10,
  },
});
