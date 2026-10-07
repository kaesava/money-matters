import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { showMobileConfirm, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { NextPaydayIncomeItem } from './next-pay/NextPaydayIncomeItem';

export interface MobileIncomeItem {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly expectedDate: string;
  readonly status?: string;
  readonly isSaved?: boolean;
  readonly bankAccountId?: string | null;
  readonly bankAccountName?: string | null;
  readonly availableToBudget?: number | null;
}

export interface MobileNextPaydayCardProps {
  readonly upcomingIncomes: readonly MobileIncomeItem[];
  readonly onPressRunSplit: (eventId: string) => void;
  readonly onDeleteIncome: (eventId: string) => void;
}

function calculateIncomeDueStatus(expectedDate: string): { daysAwayText: string; isOverdue: boolean } {
  if (!expectedDate) return { daysAwayText: '', isOverdue: false };
  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);
  const payDate = new Date(expectedDate);
  payDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return { daysAwayText: t('dashboard.hero.dueToday'), isOverdue: false };
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

export function MobileNextPaydayCard({
  upcomingIncomes,
  onPressRunSplit,
  onDeleteIncome,
}: MobileNextPaydayCardProps) {
  const router = useRouter();

  const earliestPendingId = useMemo(() => {
    if (!upcomingIncomes || upcomingIncomes.length === 0) return null;
    const pending = upcomingIncomes.filter((item) => item.status !== 'CONFIRMED');
    if (pending.length === 0) return null;
    const sorted = [...pending].sort(
      (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
    );
    return sorted[0].id;
  }, [upcomingIncomes]);

  const itemsToShow = upcomingIncomes.slice(0, 3);

  const handleDeletePress = (item: MobileIncomeItem) => {
    showMobileConfirm({
      title: t('dashboard.deleteIncomeTitle'),
      message: t('dashboard.deleteIncomeConfirmPrompt', { name: item.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: () => onDeleteIncome(item.id),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="calendar" size={16} color={DESIGN_TOKENS.colors.accent} />
          <Text style={styles.sectionTitle}>
            {upcomingIncomes.length > 0
              ? t('dashboard.nextPay.upcomingIncomeWithCount', { count: upcomingIncomes.length })
              : t('dashboard.nextPay.upcomingIncome')}
          </Text>
        </View>

        {upcomingIncomes.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/paychecks' as never)}
            style={styles.showMoreBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.showMoreText}>{t('dashboard.nextPay.showMore')}</Text>
            <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {upcomingIncomes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('dashboard.nextPay.noUpcoming')}</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {itemsToShow.map((item) => {
            const isEarliest = item.id === earliestPendingId;
            const { daysAwayText, isOverdue } = calculateIncomeDueStatus(item.expectedDate);

            return (
              <NextPaydayIncomeItem
                key={item.id}
                item={item}
                isEarliest={isEarliest}
                daysAwayText={daysAwayText}
                isOverdue={isOverdue}
                onPressRunSplit={onPressRunSplit}
                onDeletePress={handleDeletePress}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 6,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
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
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  listContainer: {
    gap: 8,
  },
});

export default MobileNextPaydayCard;
