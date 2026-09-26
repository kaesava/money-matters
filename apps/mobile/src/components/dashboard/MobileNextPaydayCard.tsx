import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { showMobileConfirm } from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../../lib/format';

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
          <Feather name="calendar" size={16} color="#2563eb" />
          <Text style={styles.sectionTitle}>
            {upcomingIncomes.length > 0
              ? t('dashboard.nextPay.upcomingIncomeWithCount', { count: upcomingIncomes.length })
              : t('dashboard.nextPay.upcomingIncome')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(app)/paychecks' as never)}
          style={styles.showMoreBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.showMoreText}>{t('dashboard.nextPay.showMore')}</Text>
          <Feather name="chevron-right" size={14} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {upcomingIncomes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('dashboard.nextPay.noUpcoming')}</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {itemsToShow.map((item) => {
            const isEarliest = item.id === earliestPendingId;
            const isSaved = item.isSaved || item.status === 'DRAFT' || item.status === 'SAVED';

            let daysAwayText = '';
            let isOverdue = false;
            if (item.expectedDate) {
              const todayZero = new Date();
              todayZero.setHours(0, 0, 0, 0);
              const payDate = new Date(item.expectedDate);
              payDate.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil(
                (payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (diffDays === 0) {
                daysAwayText = t('dashboard.hero.dueToday');
              } else if (diffDays > 0) {
                daysAwayText = t('dashboard.upcomingExpensesTransfers.daysAway', {
                  count: diffDays,
                  plural: diffDays === 1 ? '' : 's',
                });
              } else {
                isOverdue = true;
                const count = Math.abs(diffDays);
                daysAwayText = t('dashboard.upcomingExpensesTransfers.daysOverdue', {
                  count,
                  plural: count === 1 ? '' : 's',
                });
              }
            }

            return (
              <View key={item.id} style={styles.incomeItemCard}>
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
                    onPress={() => handleDeletePress(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
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
    color: '#1B2B4B',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  listContainer: {
    gap: 8,
  },
  incomeItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1B2B4B',
  },
  nextBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nextBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  savedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  savedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  incomeMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  incomeAmount: {
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  daysAwayText: {
    fontWeight: '600',
    color: '#475569',
  },
  overdueText: {
    fontWeight: '800',
    color: '#ba1a1a',
  },
  bankAccountText: {
    fontSize: 11,
    color: '#64748B',
  },
  budgetAmount: {
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  splitBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  splitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

export default MobileNextPaydayCard;
