import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD, formatDate } from '../../../lib/format';
import { TransactionRow } from '../../../components/TransactionRow';
import { CategoryItemModal } from '../../../components/CategoryItemModal';
import { MarkPaidModal, MarkPaidEvent } from '../../../components/MarkPaidModal';

export default function CategoryDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [catModalVisible, setCatModalVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user && !!id,
  });
  const txLedgerQuery = trpc.listTransactions.useQuery(
    { categoryId: id, limit: 10 },
    { enabled: !!session?.user && !!id }
  );

  const category = (categoriesQuery.data ?? []).find((c) => c.id === id);
  const pool = (poolsQuery.data ?? []).find((p) => p.id === category?.poolId);
  const bankAccount = (bankAccountsQuery.data ?? []).find((b) => b.id === pool?.bankAccountId);

  const upcomingExpenses = useMemo(() => {
    return (expenseEventsQuery.data ?? [])
      .filter((e) => e.status !== 'CONFIRMED' && e.categoryId === id)
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [expenseEventsQuery.data, id]);

  const topUpcomingExpenses = upcomingExpenses.slice(0, 5);
  const recentTransactions = (txLedgerQuery.data ?? []).slice(0, 5);

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo as never);
    } else if (pool?.id) {
      router.push(`/(app)/pools/${pool.id}` as never);
    } else {
      router.back();
    }
  };

  if (categoriesQuery.isLoading || poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!category) {
    return (
      <AppScreenWrapper
        title={t('categories.categoryNotFound')}
        showBack
        onBackPress={handleBack}
      >
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.categoryNotFound')}</Text>
        </View>
      </AppScreenWrapper>
    );
  }

  return (
    <AppScreenWrapper
      title={category.name}
      showBack
      onBackPress={handleBack}
      scrollable={false}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Read-only Pool Summary Card */}
        {pool && (
          <View style={styles.poolSummaryCard}>
            <View style={styles.poolSummaryHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.tagsRow}>
                  <Text style={styles.poolTypeTag}>{pool.poolType}</Text>
                  {pool.isSurplusTarget && (
                    <View style={styles.surplusPill}>
                      <Text style={styles.surplusPillText}>{t('categories.surplusBadgeText')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.poolNameTitle}>{pool.name}</Text>
                {bankAccount && (
                  <Text style={styles.bankNameMeta}>{bankAccount.name}</Text>
                )}
              </View>
              <View style={styles.balanceCol}>
                <Text style={styles.balanceLabel}>{t('common.balance')}</Text>
                <Text style={styles.balanceAmount}>{formatAUD(pool.currentBalance)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Category Details Card */}
        <View style={styles.categoryCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.tagsRow}>
                <Text style={styles.categoryBadge}>{t('dashboard.breakdown')}</Text>
                {category.isEssential && (
                  <View style={styles.essentialBadge}>
                    <Text style={styles.essentialText}>{t('categories.essentialBadge')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.catTitle}>{category.name}</Text>
              <Text style={styles.catFreq}>
                {category.budgetFrequency || t('categories.frequencyMonthly')}
              </Text>
            </View>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>{t('common.budget')}</Text>
              <Text style={styles.balanceAmount}>
                ${parseFloat(category.monthlyAmount || '0').toFixed(2)}/mo
              </Text>
              {category.enteredAmount &&
                category.budgetFrequency &&
                category.budgetFrequency !== 'MONTHLY' && (
                  <Text style={styles.catSubAmount}>
                    (${parseFloat(category.enteredAmount).toFixed(2)}/{category.budgetFrequency.toLowerCase()})
                  </Text>
                )}
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setCatModalVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={14} color="#2563eb" />
              <Text style={styles.actionBtnText}>{t('categories.editCategory')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Expenses Section */}
        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity
            onPress={() => setUpcomingExpanded((v) => !v)}
            style={styles.accordionHeaderBtn}
            activeOpacity={0.7}
          >
            <Feather
              name={upcomingExpanded ? 'chevron-down' : 'chevron-right'}
              size={16}
              color="#1B2B4B"
            />
            <Text style={styles.sectionTitle}>
              {t('incomeBillsTabs.upcomingExpensesTitle')} ({upcomingExpenses.length})
            </Text>
          </TouchableOpacity>
          {upcomingExpenses.length > 5 && (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/(app)/paychecks?tab=EVENTS&type=EXPENSE&categoryId=${category.id}&returnTo=${encodeURIComponent(`/(app)/categories/${category.id}`)}` as never
                )
              }
              style={styles.viewHistoryBtn}
            >
              <Text style={styles.viewHistoryText}>
                {t('categories.seeAllUpcomingExpenses')}
              </Text>
              <Feather name="chevron-right" size={13} color="#2563eb" />
            </TouchableOpacity>
          )}
        </View>

        {upcomingExpanded && (
          <>
            {topUpcomingExpenses.length > 0 ? (
              <View style={styles.upcomingList}>
                {topUpcomingExpenses.map((exp) => (
                  <View key={exp.id} style={styles.upcomingCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upcomingName}>{exp.name || t('common.description')}</Text>
                      <Text style={styles.upcomingDate}>
                        {formatDate(exp.expectedDate)}
                      </Text>
                    </View>

                    <View style={styles.upcomingRightCol}>
                      <Text style={styles.upcomingAmount}>
                        {formatAUD(exp.expectedAmount)}
                      </Text>
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => {
                          setMarkPaidEvent({
                            id: exp.id,
                            name: exp.name || 'Expense',
                            expectedAmount: parseFloat(exp.expectedAmount),
                            expectedDate: exp.expectedDate,
                            poolId: exp.poolId,
                            categoryId: exp.categoryId,
                          });
                        }}
                      >
                        <Feather name="check" size={12} color="#FFFFFF" />
                        <Text style={styles.payBtnText}>{t('common.markSpent')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {t('badges.noUpcomingBills')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Recent History Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <TouchableOpacity
            onPress={() => setHistoryExpanded((v) => !v)}
            style={styles.accordionHeaderBtn}
            activeOpacity={0.7}
          >
            <Feather
              name={historyExpanded ? 'chevron-down' : 'chevron-right'}
              size={16}
              color="#1B2B4B"
            />
            <Text style={styles.sectionTitle}>
              {t('categories.recentHistory')} ({recentTransactions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(app)/transactions?categoryId=${category.id}&returnTo=${encodeURIComponent(`/(app)/categories/${category.id}`)}` as never
              )
            }
            style={styles.viewHistoryBtn}
          >
            <Text style={styles.viewHistoryText}>
              {t('categories.seeAllHistory')}
            </Text>
            <Feather name="chevron-right" size={13} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {historyExpanded && (
          <>
            {recentTransactions.length > 0 ? (
              <View style={styles.recentTxList}>
                {recentTransactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    amount={tx.amount}
                    flowType={tx.flowType as 'DEBIT' | 'CREDIT' | 'TRANSFER'}
                    poolName={tx.poolName}
                    categoryName={tx.categoryName}
                    note={tx.note}
                    recordedAt={tx.recordedAt}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {t('categories.noRecentActivity')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Category Modal */}
      {pool && (
        <CategoryItemModal
          visible={catModalVisible}
          poolId={pool.id}
          categoryToEdit={{
            id: category.id,
            name: category.name,
            poolId: category.poolId,
            monthlyAmount: category.monthlyAmount,
            enteredAmount: category.enteredAmount,
            budgetFrequency: category.budgetFrequency as
              | 'MONTHLY'
              | 'WEEKLY'
              | 'FORTNIGHTLY'
              | 'ANNUALLY'
              | null
              | undefined,
            isEssential: category.isEssential,
          }}
          onClose={() => setCatModalVisible(false)}
          onSuccess={() => {
            categoriesQuery.refetch();
            poolsQuery.refetch();
          }}
        />
      )}

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />
    </AppScreenWrapper>
  );
}
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundContainer: {
    padding: 30,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  poolSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  poolSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
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
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  surplusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  poolNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  bankNameMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  catTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  catFreq: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  catSubAmount: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  essentialBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  essentialText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  accordionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  upcomingList: {
    gap: 10,
  },
  upcomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  upcomingDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  upcomingRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#BA1A1A',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recentTxList: {
    gap: 8,
  },
  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
