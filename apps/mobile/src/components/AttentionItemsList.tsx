import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { ReconcileNudgeCard } from './dashboard/attention/ReconcileNudgeCard';
import { AttentionTransferItem } from './dashboard/attention/AttentionTransferItem';
import { AttentionExpenseItem } from './dashboard/attention/AttentionExpenseItem';

export interface AttentionItem {
  readonly id: string;
  readonly type?: 'EXPENSE' | 'TRANSFER';
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId?: string | null;
  readonly isOverdue: boolean;
  readonly categoryBalance?: number;
  readonly categoryName?: string | null;
  readonly sourcePoolId?: string | null;
  readonly sourcePoolName?: string | null;
  readonly destinationPoolId?: string | null;
  readonly destinationPoolName?: string | null;
}

export interface AttentionItemsListProps {
  readonly items: readonly AttentionItem[];
  readonly onMarkPaid: (item: AttentionItem) => void;
  readonly onSkipExpense?: (item: AttentionItem) => void;
  readonly onExecuteTransfer?: (item: AttentionItem) => void;
  readonly onDeleteTransfer?: (item: AttentionItem) => void;
  readonly onTopUpShortfall?: (item: AttentionItem) => void;
  readonly needsBankReconciliation?: boolean;
}

function calculateDueStatus(expectedDate: string): { daysAwayText: string; isOverdue: boolean } {
  if (!expectedDate) return { daysAwayText: '', isOverdue: false };
  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);
  const payDate = new Date(expectedDate);
  payDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return { daysAwayText: t('dashboard.upcomingExpensesTransfers.dueToday'), isOverdue: false };
  } else if (diffDays > 0) {
    return {
      daysAwayText: t('dashboard.upcomingExpensesTransfers.daysAway', {
        count: diffDays,
        plural: diffDays === 1 ? '' : 's',
      }),
      isOverdue: false,
    };
  }
  const count = Math.abs(diffDays);
  return {
    daysAwayText: t('dashboard.upcomingExpensesTransfers.daysOverdue', {
      count,
      plural: count === 1 ? '' : 's',
    }),
    isOverdue: true,
  };
}

export const AttentionItemsList: React.FC<AttentionItemsListProps> = ({
  items,
  onMarkPaid,
  onSkipExpense,
  onExecuteTransfer,
  onDeleteTransfer,
  onTopUpShortfall,
  needsBankReconciliation,
}) => {
  const router = useRouter();

  if ((!items || items.length === 0) && !needsBankReconciliation) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.cardContainer}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="clock" size={16} color={DESIGN_TOKENS.colors.accent} />
              <Text style={styles.headerTitle}>
                {t('dashboard.upcomingExpensesTransfers.title')}
              </Text>
            </View>
          </View>
          <Text style={styles.emptyText}>
            {t('dashboard.upcomingExpensesTransfers.empty')}
          </Text>
        </View>
      </View>
    );
  }

  const itemsToShow = items.slice(0, 3);

  return (
    <View style={styles.wrapper}>
      {needsBankReconciliation && <ReconcileNudgeCard />}

      {itemsToShow.length > 0 && (
        <View style={styles.cardContainer}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="clock" size={16} color={DESIGN_TOKENS.colors.accent} />
              <Text style={styles.headerTitle}>
                {t('dashboard.upcomingExpensesTransfers.title')} ({items.length})
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(app)/upcoming' as never)}
              style={styles.showMoreBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.showMoreText}>{t('common.showMore')}</Text>
              <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.listWrap}>
            {itemsToShow.map((item) => {
              const { daysAwayText, isOverdue } = calculateDueStatus(item.expectedDate);

              if (item.type === 'TRANSFER') {
                return (
                  <AttentionTransferItem
                    key={item.id}
                    item={item}
                    daysAwayText={daysAwayText}
                    isOverdue={isOverdue}
                    onExecuteTransfer={onExecuteTransfer}
                    onDeleteTransfer={onDeleteTransfer}
                  />
                );
              }

              return (
                <AttentionExpenseItem
                  key={item.id}
                  item={item}
                  daysAwayText={daysAwayText}
                  isOverdue={isOverdue}
                  onMarkPaid={onMarkPaid}
                  onSkipExpense={onSkipExpense}
                  onTopUpShortfall={onTopUpShortfall}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    marginVertical: 6,
    paddingHorizontal: 20,
  },
  cardContainer: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    paddingVertical: 10,
    textAlign: 'center',
  },
  listWrap: {
    gap: 8,
  },
});

export default AttentionItemsList;
