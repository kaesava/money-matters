import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SegmentedTabs,
  SearchInput,
  SkeletonCard,
  showMobileConfirm,
  MobileBankPicker,
  MobilePoolPicker,
  MobilePaginationBar,
  MobileButton,
} from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

import { MobileMatrixPlanTab } from '../../components/paychecks/MobileMatrixPlanTab';
import { IncomeExpenseFormModal, SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { EventOverrideModal } from '../../components/EventOverrideModal';
import { PaycheckEventSection, PaycheckIncomeEvent, PaycheckExpenseEvent } from '../../components/paychecks/PaycheckEventSection';
import { IncomeSourceCard, IncomeSourceItem } from '../../components/paychecks/IncomeSourceCard';
import { ExpenseBillCard, ExpenseSourceItem } from '../../components/paychecks/ExpenseBillCard';

export type PaycheckTabSegment = 'MATRIX' | 'EVENTS' | 'SOURCES';

interface IncomeAndBillsScreenProps {
  initialTab?: PaycheckTabSegment;
}

export default function IncomeAndBillsScreen({ initialTab }: IncomeAndBillsScreenProps = {}) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const resolvedInitialTab: PaycheckTabSegment = initialTab || (
    searchParams.tab?.toUpperCase() === 'EVENTS'
      ? 'EVENTS'
      : searchParams.tab?.toUpperCase() === 'SOURCES'
      ? 'SOURCES'
      : 'MATRIX'
  );

  const [activeSegment, setActiveSegment] = useState<PaycheckTabSegment>(resolvedInitialTab);
  const [refreshing, setRefreshing] = useState(false);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  const [setupSubSegment, setSetupSubSegment] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [selectedIncomeBankId, setSelectedIncomeBankId] = useState<string>('ALL');
  const [selectedExpensePoolId, setSelectedExpensePoolId] = useState<string>('ALL');
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const PAGE_SIZE = 10;

  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [eventToOverride, setEventToOverride] = useState<{
    id: string;
    eventType: 'INCOME' | 'EXPENSE';
    name: string;
    expectedDate: string;
    expectedAmount: string;
  } | null>(null);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const deleteIncomeEventMut = trpc.deleteIncomeEvent.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
    },
  });

  const deleteExpenseEventMut = trpc.deleteExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      incomeEventsQuery.refetch(),
      expenseEventsQuery.refetch(),
      incomeSourcesQuery.refetch(),
      expenseSourcesQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleDeleteIncomeEvent = (item: { id: string; name?: string | null }) => {
    showMobileConfirm({
      title: t('payday.deleteIncomeEvent') || 'Delete Income Event',
      message: t('payday.deleteIncomeEventConfirm') || `Are you sure you want to delete this upcoming income event?`,
      confirmText: t('common.delete') || 'Delete',
      onConfirm: () => deleteIncomeEventMut.mutate({ eventId: item.id }),
    });
  };

  const handleDeleteExpenseEvent = (item: { id: string; name?: string | null }) => {
    showMobileConfirm({
      title: 'Delete Expense Event',
      message: `Are you sure you want to delete "${item.name || 'Expense'}"?`,
      confirmText: t('common.delete') || 'Delete',
      onConfirm: () => deleteExpenseEventMut.mutate({ eventId: item.id }),
    });
  };

  const incomeEventsList = (incomeEventsQuery.data ?? []).filter(
    (e) => e.status === 'PENDING'
  );
  const expenseEventsList = (expenseEventsQuery.data ?? []).filter(
    (e) => e.status === 'PENDING'
  );

  const enrichedIncomeSources: IncomeSourceItem[] = useMemo(() => {
    return incomeSources.map((s) => {
      const acct = bankAccounts.find((b) => b.id === s.receivingAccountId);
      return {
        ...s,
        accountName: acct?.name || null,
      };
    });
  }, [incomeSources, bankAccounts]);

  const filteredIncomeSources = useMemo(() => {
    return enrichedIncomeSources.filter((s) => {
      if (selectedIncomeBankId !== 'ALL' && s.receivingAccountId !== selectedIncomeBankId) {
        return false;
      }
      if (!scheduleSearchQuery.trim()) return true;
      const q = scheduleSearchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.accountName && s.accountName.toLowerCase().includes(q)) ||
        String(s.amount).includes(q)
      );
    });
  }, [enrichedIncomeSources, selectedIncomeBankId, scheduleSearchQuery]);

  const enrichedExpenseSources: ExpenseSourceItem[] = useMemo(() => {
    return expenseSources.map((s) => {
      const pool = pools.find((p) => p.id === (s.poolId || s.categoryId));
      return {
        ...s,
        poolName: s.poolName || pool?.name || null,
      };
    });
  }, [expenseSources, pools]);

  const filteredExpenseSources = useMemo(() => {
    return enrichedExpenseSources.filter((s) => {
      if (selectedExpensePoolId !== 'ALL' && (s.poolId || s.categoryId) !== selectedExpensePoolId) {
        return false;
      }
      if (!scheduleSearchQuery.trim()) return true;
      const q = scheduleSearchQuery.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.poolName && s.poolName.toLowerCase().includes(q)) ||
        (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
        String(s.amount).includes(q)
      );
    });
  }, [enrichedExpenseSources, selectedExpensePoolId, scheduleSearchQuery]);

  const paginatedIncomeSources = useMemo(() => {
    const start = (incomePage - 1) * PAGE_SIZE;
    return filteredIncomeSources.slice(start, start + PAGE_SIZE);
  }, [filteredIncomeSources, incomePage]);

  const paginatedExpenseSources = useMemo(() => {
    const start = (expensePage - 1) * PAGE_SIZE;
    return filteredExpenseSources.slice(start, start + PAGE_SIZE);
  }, [filteredExpenseSources, expensePage]);

  return (
    <AppScreenWrapper
      title={t('nav.schedules')}
      scrollable={false}
      infoTooltip={{
        title: t('tooltips.incomeBills.title'),
        content: t('tooltips.incomeBills.content'),
      }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
          <SegmentedTabs<PaycheckTabSegment>
            tabs={[
              { key: 'MATRIX', label: t('incomeBillsTabs.matrixPlan') },
              { key: 'EVENTS', label: t('incomeBillsTabs.upcomingTimeline') },
              { key: 'SOURCES', label: t('incomeBillsTabs.setupSources') },
            ]}
            activeKey={activeSegment}
            onChange={setActiveSegment}
          />
        </View>

        {/* View 1: 12-Month Matrix Plan Carousel */}
        {activeSegment === 'MATRIX' && <MobileMatrixPlanTab />}

        {/* View 2: Upcoming Timeline */}
        {activeSegment === 'EVENTS' && (
          <View style={styles.eventsView}>
            <PaycheckEventSection
              incomeEvents={incomeEventsList.map((e) => ({
                id: e.id,
                name: e.name,
                expectedAmount: e.expectedAmount,
                expectedDate: e.expectedDate,
              }))}
              expenseEvents={expenseEventsList.map((e) => ({
                id: e.id,
                name: e.name,
                expectedAmount: e.expectedAmount,
                expectedDate: e.expectedDate,
                categoryId: e.categoryId,
              }))}
              onOpenPaydayWizard={(incomeEventId) =>
                router.push(`/(app)/paychecks/${incomeEventId}` as never)
              }
              onEditUpcomingIncome={(inc) => {
                setEventToOverride({
                  id: inc.id,
                  eventType: 'INCOME',
                  name: inc.name || 'Income',
                  expectedDate: inc.expectedDate,
                  expectedAmount: inc.expectedAmount,
                });
                setOverrideModalVisible(true);
              }}
              onDeleteUpcomingIncome={handleDeleteIncomeEvent}
              onMarkExpensePaid={(eventId, amount) => {
                const expense = expenseEventsList.find((e) => e.id === eventId);
                if (expense) {
                  setMarkPaidEvent({
                    id: expense.id,
                    name: expense.name || 'Expense',
                    expectedAmount: parseFloat(amount),
                    expectedDate: expense.expectedDate,
                    poolId: expense.poolId,
                    categoryId: expense.categoryId,
                  });
                }
              }}
              onEditUpcomingExpense={(expense) => {
                const fullExpense = expenseEventsList.find((e) => e.id === expense.id);
                if (fullExpense) {
                  setEventToOverride({
                    id: fullExpense.id,
                    eventType: 'EXPENSE',
                    name: fullExpense.name || 'Expense',
                    expectedDate: fullExpense.expectedDate,
                    expectedAmount: fullExpense.expectedAmount,
                  });
                  setOverrideModalVisible(true);
                }
              }}
              onDeleteUpcomingExpense={handleDeleteExpenseEvent}
            />
          </View>
        )}

        {/* View 3: Recurring Schedules (Setup Sources) */}
        {activeSegment === 'SOURCES' && (
          <View style={styles.sourcesView}>
            {/* Sub-tabs for Income Schedules vs Expense Bills */}
            <View style={{ marginBottom: 14 }}>
              <SegmentedTabs<'INCOME' | 'EXPENSE'>
                tabs={[
                  {
                    key: 'INCOME',
                    label: `${t('incomeBillsTabs.incomeSchedules')} (${filteredIncomeSources.length})`,
                  },
                  {
                    key: 'EXPENSE',
                    label: `${t('incomeBillsTabs.expenseSchedules')} (${filteredExpenseSources.length})`,
                  },
                ]}
                activeKey={setupSubSegment}
                onChange={(key) => {
                  setSetupSubSegment(key);
                  setScheduleSearchQuery('');
                }}
              />
            </View>

            {/* Search row */}
            <View style={{ marginBottom: 12 }}>
              <SearchInput
                placeholder={t('payday.searchSchedules')}
                value={scheduleSearchQuery}
                onChangeText={(text) => {
                  setScheduleSearchQuery(text);
                  setIncomePage(1);
                  setExpensePage(1);
                }}
              />
            </View>

            {/* Filter and Add Button Row */}
            {setupSubSegment === 'INCOME' ? (
              <View style={styles.controlsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <MobileBankPicker
                    banks={bankAccounts.map((b) => ({
                      id: b.id,
                      name: b.name,
                      institution: b.bankProvider,
                    }))}
                    selectedBankId={selectedIncomeBankId}
                    onSelectBank={(bId) => {
                      setSelectedIncomeBankId(bId);
                      setIncomePage(1);
                    }}
                    allowAllOption={true}
                    compact={true}
                  />
                </View>

                <MobileButton
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setSourceToEdit(null);
                    setFormMode('INCOME');
                    setFormModalVisible(true);
                  }}
                >
                  {t('modals.incomeExpenseForm.titleAddIncome')}
                </MobileButton>
              </View>
            ) : (
              <View style={styles.controlsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <MobilePoolPicker
                    pools={pools.map((p) => ({
                      id: p.id,
                      name: p.name,
                      poolType: p.poolType,
                      currentBalance: p.currentBalance,
                      isPrivate: p.isPrivate,
                    }))}
                    selectedPoolId={selectedExpensePoolId}
                    onSelectPool={(pId) => {
                      setSelectedExpensePoolId(pId);
                      setExpensePage(1);
                    }}
                    allowAllOption={true}
                    compact={true}
                  />
                </View>

                <MobileButton
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setSourceToEdit(null);
                    setFormMode('EXPENSE');
                    setFormModalVisible(true);
                  }}
                >
                  {t('modals.incomeExpenseForm.titleAddExpense')}
                </MobileButton>
              </View>
            )}

            {/* Cards Stack */}
            {setupSubSegment === 'INCOME' && (
              <View style={styles.cardsStack}>
                {incomeSourcesQuery.isLoading ? (
                  <SkeletonCard count={2} />
                ) : filteredIncomeSources.length === 0 ? (
                  <Text style={styles.emptySchedulesText}>
                    {t('payday.noIncomeSchedules')}
                  </Text>
                ) : (
                  <>
                    {paginatedIncomeSources.map((inc: IncomeSourceItem) => (
                      <IncomeSourceCard
                        key={inc.id}
                        inc={inc}
                        onEdit={(s) => {
                          setSourceToEdit(s);
                          setFormMode('INCOME');
                          setFormModalVisible(true);
                        }}
                      />
                    ))}
                    {filteredIncomeSources.length >= 5 && (
                      <MobilePaginationBar
                        page={incomePage}
                        totalPages={Math.ceil(filteredIncomeSources.length / PAGE_SIZE)}
                        pageSize={PAGE_SIZE}
                        totalItems={filteredIncomeSources.length}
                        onPageChange={setIncomePage}
                        onPageSizeChange={() => {}}
                      />
                    )}
                  </>
                )}
              </View>
            )}

            {setupSubSegment === 'EXPENSE' && (
              <View style={styles.cardsStack}>
                {expenseSourcesQuery.isLoading ? (
                  <SkeletonCard count={2} />
                ) : filteredExpenseSources.length === 0 ? (
                  <Text style={styles.emptySchedulesText}>
                    {t('payday.noExpenseBills')}
                  </Text>
                ) : (
                  <>
                    {paginatedExpenseSources.map((exp: ExpenseSourceItem) => (
                      <ExpenseBillCard
                        key={exp.id}
                        exp={exp}
                        categoryName={exp.poolName || exp.categoryName || 'Pool'}
                        onEdit={(s) => {
                          setSourceToEdit(s);
                          setFormMode('EXPENSE');
                          setFormModalVisible(true);
                        }}
                      />
                    ))}
                    {filteredExpenseSources.length >= 5 && (
                      <MobilePaginationBar
                        page={expensePage}
                        totalPages={Math.ceil(filteredExpenseSources.length / PAGE_SIZE)}
                        pageSize={PAGE_SIZE}
                        totalItems={filteredExpenseSources.length}
                        onPageChange={setExpensePage}
                        onPageSizeChange={() => {}}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Schedule Form Modal */}
      <IncomeExpenseFormModal
        visible={formModalVisible}
        mode={formMode}
        sourceToEdit={sourceToEdit}
        onClose={() => setFormModalVisible(false)}
        onSuccess={() => {
          incomeSourcesQuery.refetch();
          expenseSourcesQuery.refetch();
          incomeEventsQuery.refetch();
          expenseEventsQuery.refetch();
        }}
      />

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          poolsQuery.refetch();
        }}
      />

      {/* Single Event Override Modal */}
      <EventOverrideModal
        visible={overrideModalVisible}
        eventToEdit={
          eventToOverride
            ? {
                id: eventToOverride.id,
                eventType: eventToOverride.eventType,
                name: eventToOverride.name || (eventToOverride.eventType === 'INCOME' ? 'Income' : 'Expense'),
                expectedDate: eventToOverride.expectedDate,
                expectedAmount: eventToOverride.expectedAmount,
              }
            : null
        }
        onClose={() => setOverrideModalVisible(false)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          incomeEventsQuery.refetch();
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#1B2B4B',
    fontWeight: '800',
  },
  eventsView: {
    paddingHorizontal: 20,
  },
  sourcesView: {
    paddingHorizontal: 20,
  },
  scheduleSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 14,
  },
  scheduleSearchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1B2B4B',
  },
  emptySchedulesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addScheduleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  cardsStack: {
    gap: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
});
