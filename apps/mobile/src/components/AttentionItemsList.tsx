import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../lib/format';

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
              <Feather name="clock" size={16} color="#2563eb" />
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
      {/* Bank Reconcile Card */}
      {needsBankReconciliation && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(app)/settings/bank-accounts' as never)}
          style={styles.reconcileCard}
        >
          <Feather name="refresh-cw" size={16} color="#D97706" />
          <View style={styles.bannerContent}>
            <Text style={styles.reconcileTitle}>
              {t('bankAccounts.reconcileNudgeTitle')}
            </Text>
            <Text style={styles.reconcileDesc}>
              {t('bankAccounts.reconcileNudgeDesc')}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#D97706" />
        </TouchableOpacity>
      )}

      {/* Overdue and Approaching Bills & Transfers */}
      {itemsToShow.length > 0 && (
        <View style={styles.cardContainer}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="clock" size={16} color="#2563eb" />
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
              <Feather name="chevron-right" size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.listWrap}>
            {itemsToShow.map((item) => {
              const isTransfer = item.type === 'TRANSFER';
              const catBal = item.categoryBalance ?? 0;
              const shortfall = item.expectedAmount - catBal;
              const isFunded = shortfall <= 0;

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
                  daysAwayText = t('dashboard.upcomingExpensesTransfers.dueToday');
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

              if (isTransfer) {
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemLeft}>
                      <View style={styles.titleWithBadge}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            item.isOverdue || isOverdue
                              ? styles.overdueBadge
                              : styles.transferBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              item.isOverdue || isOverdue
                                ? styles.overdueBadgeText
                                : styles.transferBadgeText,
                            ]}
                          >
                            {item.isOverdue || isOverdue
                              ? t('common.overdue')
                              : t('common.transfer')}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.itemMeta}>
                        <Text style={styles.amountText}>{formatAUD(item.expectedAmount)}</Text>
                        {' · '}
                        <Text style={item.isOverdue || isOverdue ? styles.overdueDateText : styles.normalDateText}>
                          {daysAwayText}
                        </Text>
                        {' '}({formatDate(item.expectedDate)})
                      </Text>

                      <Text style={styles.transferRouteText} numberOfLines={1}>
                        {item.sourcePoolName || 'Source'} ➔ {item.destinationPoolName || 'Dest'}
                      </Text>
                    </View>

                    <View style={styles.actionColumn}>
                      {onExecuteTransfer && (
                        <TouchableOpacity
                          style={styles.actionPrimaryBtn}
                          onPress={() => onExecuteTransfer(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionPrimaryBtnText}>
                            {t('common.transfer')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {onDeleteTransfer && (
                        <TouchableOpacity
                          style={styles.deleteLink}
                          onPress={() => onDeleteTransfer(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.deleteLinkText}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }

              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemLeft}>
                    <View style={styles.titleWithBadge}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          item.isOverdue || isOverdue
                            ? styles.overdueBadge
                            : styles.dueSoonBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            item.isOverdue || isOverdue
                              ? styles.overdueBadgeText
                              : styles.dueSoonBadgeText,
                          ]}
                        >
                          {item.isOverdue || isOverdue
                            ? t('common.overdue')
                            : t('common.dueSoon')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.itemMeta}>
                      <Text style={styles.amountText}>{formatAUD(item.expectedAmount)}</Text>
                      {' · '}
                      <Text style={item.isOverdue || isOverdue ? styles.overdueDateText : styles.normalDateText}>
                        {daysAwayText}
                      </Text>
                      {' '}({formatDate(item.expectedDate)})
                    </Text>

                    {item.categoryName ? (
                      <Text style={styles.categorySubText}>
                        {item.categoryName}
                        {typeof item.categoryBalance === 'number' && (
                          <Text style={styles.categoryBalText}>
                            {' '}{t('dashboard.upcomingExpensesTransfers.availableSuffix', {
                              amount: formatAUD(item.categoryBalance),
                            })}
                          </Text>
                        )}
                        {' · '}
                        {isFunded ? (
                          <Text style={styles.fundedText}>
                            {t('dashboard.attention.categoryFunded')}
                          </Text>
                        ) : (
                          <Text
                            style={styles.shortText}
                            onPress={() => onTopUpShortfall?.(item)}
                          >
                            {t('dashboard.attention.categoryShort', {
                              amount: formatAUD(shortfall),
                            })}
                          </Text>
                        )}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actionColumn}>
                    <TouchableOpacity
                      style={styles.actionPrimaryBtn}
                      onPress={() => onMarkPaid(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionPrimaryBtnText}>
                        {t('common.markSpent')}
                      </Text>
                    </TouchableOpacity>

                    {onSkipExpense && (
                      <TouchableOpacity
                        style={styles.deleteLink}
                        onPress={() => onSkipExpense(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteLinkText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
  reconcileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 10,
  },
  bannerContent: {
    flex: 1,
  },
  reconcileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  reconcileDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  cardContainer: {
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
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    paddingVertical: 10,
    textAlign: 'center',
  },
  listWrap: {
    gap: 8,
  },
  itemCard: {
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
  itemLeft: {
    flex: 1,
    gap: 3,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  overdueBadge: {
    backgroundColor: '#FFE4E6',
  },
  overdueBadgeText: {
    color: '#E11D48',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dueSoonBadge: {
    backgroundColor: '#FEF3C7',
  },
  dueSoonBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  transferBadge: {
    backgroundColor: '#E0E7FF',
  },
  transferBadgeText: {
    color: '#4338CA',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  amountText: {
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  normalDateText: {
    fontWeight: '600',
    color: '#475569',
  },
  overdueDateText: {
    fontWeight: '800',
    color: '#ba1a1a',
  },
  transferRouteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  categorySubText: {
    fontSize: 11,
    color: '#64748B',
  },
  categoryBalText: {
    fontFamily: 'monospace',
    color: '#475569',
  },
  fundedText: {
    fontWeight: '700',
    color: '#15803D',
  },
  shortText: {
    fontWeight: '700',
    color: '#ba1a1a',
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionPrimaryBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  deleteLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteLinkText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

export default AttentionItemsList;
