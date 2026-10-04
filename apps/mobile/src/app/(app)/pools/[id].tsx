import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  MobileScreenWrapper,
  showMobileConfirm,
  SearchInput,
  MobileFilterSheet,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD, formatDate } from '../../../lib/format';
import { TransactionRow } from '../../../components/TransactionRow';
import { CategoryItemModal, CategoryItemToEdit } from '../../../components/CategoryItemModal';
import { CategoryFormModal } from '../../../components/CategoryFormModal';
import { QuickExpenseModal } from '../../../components/QuickExpenseModal';
import { MarkPaidModal, MarkPaidEvent } from '../../../components/MarkPaidModal';

export default function PoolDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [selectedCatForEdit, setSelectedCatForEdit] = useState<CategoryItemToEdit | null>(null);
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catSortField, setCatSortField] = useState<'name' | 'amount'>('name');
  const [catSortDir, setCatSortDir] = useState<'asc' | 'desc'>('asc');
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [catFilterSheetVisible, setCatFilterSheetVisible] = useState(false);
  const [catPriorityFilter, setCatPriorityFilter] = useState<'ALL' | 'PRIORITISED' | 'REGULAR'>('ALL');

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: !!session?.user });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const txLedgerQuery = trpc.listTransactions.useQuery({ poolId: id, limit: 10 }, { enabled: !!session?.user && !!id });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user && !!id,
  });

  const archivePoolMut = trpc.archivePool.useMutation({
    onSuccess: () => {
      utils.listPools.invalidate();
      router.back();
    },
  });

  const pool = poolsQuery.data?.find((p) => p.id === id);
  const poolCategories = (categoriesQuery.data ?? []).filter(
    (c) => c.poolId === id
  );
  const bankAccount = bankAccountsQuery.data?.find(
    (b) => b.id === pool?.bankAccountId
  );

  const isGoal = pool?.poolType === 'GOAL';

  const upcomingExpenses = useMemo(() => {
    const poolCatIds = new Set(poolCategories.map((c) => c.id));
    return (expenseEventsQuery.data ?? [])
      .filter((e) => e.status !== 'CONFIRMED' && (e.poolId === id || (e.categoryId && poolCatIds.has(e.categoryId))))
      .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  }, [expenseEventsQuery.data, id, poolCategories]);

  const topUpcomingExpenses = upcomingExpenses.slice(0, 5);

  const filteredCategories = useMemo(() => {
    return poolCategories
      .filter((c) => {
        if (catPriorityFilter === 'PRIORITISED' && !c.isEssential) return false;
        if (catPriorityFilter === 'REGULAR' && c.isEssential) return false;
        if (!catSearchQuery.trim()) return true;
        return c.name.toLowerCase().includes(catSearchQuery.toLowerCase().trim());
      })
      .sort((a, b) => {
        if (catSortField === 'name') {
          const res = a.name.localeCompare(b.name);
          return catSortDir === 'asc' ? res : -res;
        }
        const aAmt = parseFloat(a.monthlyAmount || a.enteredAmount || '0');
        const bAmt = parseFloat(b.monthlyAmount || b.enteredAmount || '0');
        return catSortDir === 'asc' ? aAmt - bAmt : bAmt - aAmt;
      });
  }, [poolCategories, catSearchQuery, catSortField, catSortDir, catPriorityFilter]);

  const activeCatFilterCount = catPriorityFilter !== 'ALL' ? 1 : 0;

  const recentTransactions = (txLedgerQuery.data ?? []).slice(0, 5);

  const handleArchivePool = () => {
    if (!pool) return;
    showMobileConfirm({
      title: t('categories.archivePool'),
      message: t('categories.archivePoolConfirm', { name: pool.name }),
      confirmText: t('categories.archivePool'),
      isDestructive: true,
      onConfirm: () => archivePoolMut.mutate({ poolId: pool.id }),
    });
  };

  if (poolsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo as never);
    } else {
      router.back();
    }
  };

  if (!pool) {
    return (
      <MobileScreenWrapper title={t('categories.poolNotFound')} showBack onBackPress={handleBack}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>{t('categories.poolNotFound')}</Text>
        </View>
      </MobileScreenWrapper>
    );
  }

  return (
    <MobileScreenWrapper
      title={pool.name}
      user={session?.user}
      showBack
      onBackPress={handleBack}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pool Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View>
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
                <Text style={styles.bankNameMeta}>
                  {t('categories.linkedAccount', { name: bankAccount.name })}
                </Text>
              )}
            </View>

            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>
                {t('categories.currentBalance')}
              </Text>
              <Text style={styles.balanceAmount}>
                {formatAUD(pool.currentBalance)}
              </Text>
            </View>
          </View>

          {/* Quick Pool Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => setMoveMoneyVisible(true)}
              style={styles.actionBtn}
            >
              <Feather name="repeat" size={14} color="#2563eb" />
              <Text style={styles.actionBtnText}>
                {t('dashboard.moveMoney')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPoolModalVisible(true)}
              style={styles.actionBtn}
            >
              <Feather name="edit-2" size={14} color="#64748B" />
              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>
                {t('categories.editPool')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleArchivePool}
              style={styles.actionBtn}
            >
              <Feather name="archive" size={14} color="#94A3B8" />
              <Text style={[styles.actionBtnText, { color: '#94A3B8' }]}>
                {t('common.archive')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nested Categories Section (Hidden for GOAL pools) */}
        {!isGoal && (
          <>
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity
                onPress={() => setCategoriesExpanded((v) => !v)}
                style={styles.accordionHeaderBtn}
                activeOpacity={0.7}
              >
                <Feather
                  name={categoriesExpanded ? 'chevron-down' : 'chevron-right'}
                  size={16}
                  color="#1B2B4B"
                />
                <Text style={styles.sectionTitle}>
                  {t('categories.poolCategories')} ({filteredCategories.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCatForEdit(null);
                  setCatModalVisible(true);
                }}
                style={styles.addCategoryBtn}
              >
                <Feather name="plus" size={14} color="#2563eb" />
                <Text style={styles.addCategoryText}>
                  {t('categories.addCategory')}
                </Text>
              </TouchableOpacity>
            </View>

            {categoriesExpanded && (
              <>
                {poolCategories.length > 0 && (
                  <View style={styles.catFilterBar}>
                    <View style={{ flex: 1 }}>
                      <SearchInput
                        placeholder={t('categories.searchCategories')}
                        value={catSearchQuery}
                        onChangeText={setCatSearchQuery}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.filterBtn, activeCatFilterCount > 0 && styles.filterBtnActive]}
                      onPress={() => setCatFilterSheetVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="sliders"
                        size={15}
                        color={activeCatFilterCount > 0 ? '#2563eb' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.filterBtnText,
                          activeCatFilterCount > 0 && styles.filterBtnTextActive,
                        ]}
                      >
                        {t('common.filter')}
                        {activeCatFilterCount > 0 ? ` (${activeCatFilterCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {filteredCategories.length > 0 ? (
                  <View style={styles.categoriesList}>
                    {filteredCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.75}
                        onPress={() =>
                          router.push(
                            `/(app)/categories/${cat.id}?returnTo=${encodeURIComponent(`/(app)/pools/${pool.id}`)}` as never
                          )
                        }
                        style={styles.categoryCard}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.catTitleRow}>
                            <Text style={styles.catName}>{cat.name}</Text>
                            {cat.isEssential && (
                              <View style={styles.essentialBadge}>
                                <Text style={styles.essentialText}>{t('categories.essentialBadge')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.catFreq}>
                            {cat.budgetFrequency || t('categories.frequencyMonthly')}
                          </Text>
                        </View>

                        <View style={styles.nestedCatRight}>
                          <View style={styles.nestedCatAmountCol}>
                            <Text style={styles.nestedCatAmount}>
                              ${parseFloat(cat.monthlyAmount || '0').toFixed(2)}/mo
                            </Text>
                            {cat.enteredAmount &&
                              cat.budgetFrequency &&
                              cat.budgetFrequency !== 'MONTHLY' && (
                                <Text style={styles.nestedCatSubAmount}>
                                  (${parseFloat(cat.enteredAmount).toFixed(2)}/{cat.budgetFrequency.toLowerCase()})
                                </Text>
                              )}
                          </View>
                          <Feather name="chevron-right" size={16} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCategoriesBox}>
                    <Text style={styles.emptyCategoriesText}>
                      {poolCategories.length === 0
                        ? t('categories.noCategoriesDefined')
                        : t('categories.noCategoriesMatched')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* Upcoming Expenses Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
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
                  `/(app)/paychecks?tab=EVENTS&type=EXPENSE&poolId=${pool.id}&returnTo=${encodeURIComponent(`/(app)/pools/${pool.id}`)}` as never
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
              <View style={styles.emptyCategoriesBox}>
                <Text style={styles.emptyCategoriesText}>
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
                `/(app)/transactions?poolId=${pool.id}&returnTo=${encodeURIComponent(`/(app)/pools/${pool.id}`)}` as never
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
              <View style={styles.emptyCategoriesBox}>
                <Text style={styles.emptyCategoriesText}>
                  {t('categories.noRecentActivity')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Category Filter Sheet */}
      <MobileFilterSheet
        visible={catFilterSheetVisible}
        onClose={() => setCatFilterSheetVisible(false)}
        title={t('common.filter')}
        activeCount={activeCatFilterCount}
        sortField={catSortField}
        sortOrder={catSortDir}
        onSortFieldChange={(field) => setCatSortField(field as 'name' | 'amount')}
        onSortOrderChange={setCatSortDir}
        sortOptions={[
          { id: 'name', label: t('common.name') || 'Name' },
          { id: 'amount', label: t('common.amount') || 'Amount' },
        ]}
        sections={[
          {
            id: 'priority',
            title: t('categories.priorityLabel') || 'Priority',
            options: [
              { id: 'ALL', label: t('transactions.filterAll') || 'All' },
              { id: 'PRIORITISED', label: t('categories.priority1') || 'Prioritised' },
              { id: 'REGULAR', label: t('categories.standardPriority') || 'Regular' },
            ],
            selectedValue: catPriorityFilter,
            onSelect: (val) => setCatPriorityFilter(val as 'ALL' | 'PRIORITISED' | 'REGULAR'),
          },
        ]}
        onReset={() => {
          setCatPriorityFilter('ALL');
          setCatSortField('name');
          setCatSortDir('asc');
        }}
      />

      {/* Category Add/Edit Modal */}
      <CategoryItemModal
        visible={catModalVisible}
        poolId={id!}
        categoryToEdit={selectedCatForEdit}
        onClose={() => setCatModalVisible(false)}
        onSuccess={() => {
          categoriesQuery.refetch();
          poolsQuery.refetch();
        }}
      />

      {/* Pool Edit Modal */}
      <CategoryFormModal
        visible={poolModalVisible}
        categoryToEdit={{
          id: pool.id,
          name: pool.name,
          type: pool.poolType,
          targetAmount: pool.targetAmount,
          targetDate: pool.targetDate,
          bankAccountId: pool.bankAccountId,
          everydayAllowanceAmount: pool.everydayAllowanceAmount,
          isSurplusTarget: pool.isSurplusTarget,
        }}
        onClose={() => setPoolModalVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Move Money Modal */}
      <QuickExpenseModal
        visible={moveMoneyVisible}
        initialType="TRANSFER"
        initialSourcePoolId={pool.id}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => poolsQuery.refetch()}
      />

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          poolsQuery.refetch();
          txLedgerQuery.refetch();
        }}
      />
    </MobileScreenWrapper>
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
  summaryCard: {
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
    backgroundColor: '#F1F5F9',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  bankNameMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    fontSize: 20,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  accordionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nestedCatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nestedCatAmountCol: {
    alignItems: 'flex-end',
  },
  nestedCatAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  nestedCatSubAmount: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  categoriesList: {
    gap: 10,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
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
  catFreq: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  catAmountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  emptyCategoriesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
  },
  emptyCategoriesText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  sheetValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  catFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#2563eb',
  },
  catSortRow: {
    flexDirection: 'row',
    gap: 4,
  },
  catSortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catSortBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  catSortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catSortBtnTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
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
  recentTxList: {
    gap: 8,
  },
  sheetLinksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
  },
  sheetLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sheetEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  sheetArchiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sheetArchiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BA1A1A',
  },
});
