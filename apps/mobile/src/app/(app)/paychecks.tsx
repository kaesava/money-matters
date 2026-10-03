import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SegmentedTabs } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';

import { SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { MarkPaidEvent } from '../../components/MarkPaidModal';
import { UpcomingEventsTab } from '../../components/paychecks/UpcomingEventsTab';
import { RecurringSchedulesTab } from '../../components/paychecks/RecurringSchedulesTab';
import { usePaychecksData } from '../../components/paychecks/usePaychecksData';
import { TransferEventData } from '../../components/paychecks/MobileTransferModal';
import { CategoryScheduledEvent } from '../../components/paychecks/MobileCategoryDetailModal';
import { BurstSourceItem, BurstEventItem } from '../../components/paychecks/MobileBurstModal';
import { IncomeSourceItem } from '../../components/paychecks/IncomeSourceCard';
import { ExpenseSourceItem } from '../../components/paychecks/ExpenseBillCard';
import { PaycheckTransferEvent } from '../../components/paychecks/PaycheckEventSection';
import { PaychecksModalManager } from '../../components/paychecks/PaychecksModalManager';

export type PaycheckTabSegment = 'EVENTS' | 'SOURCES';

interface IncomeAndBillsScreenProps {
  initialTab?: PaycheckTabSegment;
}

export default function IncomeAndBillsScreen({ initialTab }: IncomeAndBillsScreenProps = {}) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();

  const resolvedInitialTab: PaycheckTabSegment = initialTab || (
    searchParams.tab?.toUpperCase() === 'SOURCES'
      ? 'SOURCES'
      : 'EVENTS'
  );

  const [activeSegment, setActiveSegment] = useState<PaycheckTabSegment>(resolvedInitialTab);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [eventToOverride, setEventToOverride] = useState<{
    id: string;
    eventType: 'INCOME' | 'EXPENSE';
    name: string;
    expectedDate: string;
    expectedAmount: string;
  } | null>(null);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  // Transfer Modal State
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<TransferEventData | null>(null);

  // Category Detail Modal State
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: CategoryScheduledEvent[];
  } | null>(null);

  // Burst Modal State
  const [burstModalVisible, setBurstModalVisible] = useState(false);
  const [burstSource, setBurstSource] = useState<BurstSourceItem | null>(null);
  const [burstMode, setBurstMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  const {
    refreshing,
    onRefresh,
    incomeSources,
    expenseSources,
    pools,
    bankAccounts,
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    isLoadingIncome,
    isLoadingExpense,
    handleDeleteIncomeEvent,
    handleDeleteExpenseEvent,
    handleDeleteTransferEvent,
    refetchAll,
  } = usePaychecksData();

  const handleOpenTransferModal = (transferItem: PaycheckTransferEvent) => {
    setActiveTransfer({
      id: transferItem.id,
      name: transferItem.name || t('common.transfer'),
      expectedAmount: transferItem.expectedAmount,
      expectedDate: transferItem.expectedDate,
      sourcePoolId: transferItem.sourcePoolId,
      sourcePoolName: transferItem.sourcePoolName,
      destinationPoolId: transferItem.destinationPoolId,
      destinationPoolName: transferItem.destinationPoolName,
    });
    setTransferModalVisible(true);
  };

  const handleOpenNewTransfer = () => {
    setActiveTransfer({
      id: 'new',
      name: t('common.transfer'),
      expectedAmount: '',
      expectedDate: new Date().toISOString().split('T')[0] ?? '',
      sourcePoolId: pools[0]?.id || '',
      destinationPoolId: pools[1]?.id || '',
    });
    setTransferModalVisible(true);
  };

  const handleOpenBurstModal = (
    source: IncomeSourceItem | ExpenseSourceItem,
    mode: 'INCOME' | 'EXPENSE'
  ) => {
    setBurstMode(mode);
    setBurstSource({
      id: source.id,
      name: source.name,
      amount: source.amount,
      rrule: source.rrule,
      startDate: source.startDate,
      categoryName: 'categoryName' in source ? (source.categoryName || undefined) : undefined,
      accountName: 'accountName' in source ? (source.accountName || undefined) : undefined,
    });
    setBurstModalVisible(true);
  };

  const burstEvents: BurstEventItem[] = burstMode === 'INCOME'
    ? rawIncomeEvents.map((evt) => ({
        id: evt.id,
        expectedDate: evt.expectedDate,
        expectedAmount: evt.expectedAmount,
        actualAmount: evt.actualAmount,
        status: evt.status,
        incomeSourceId: evt.incomeSourceId,
        name: evt.name,
        note: evt.note,
      }))
    : rawExpenseEvents.map((evt) => ({
        id: evt.id,
        expectedDate: evt.expectedDate,
        expectedAmount: evt.expectedAmount,
        actualAmount: null,
        status: evt.status,
        expenseSourceId: evt.expenseSourceId,
        name: evt.name,
        note: null,
      }));

  return (
    <AppScreenWrapper
      title={t('nav.incomeExpenses')}
      scrollable={false}
      infoTooltip={{
        title: t('nav.incomeExpenses'),
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
        <View style={styles.topControlSection}>
          <TouchableOpacity
            style={styles.transferButton}
            onPress={handleOpenNewTransfer}
            activeOpacity={0.8}
          >
            <Feather name="repeat" size={14} color="#4338CA" />
            <Text style={styles.transferButtonText}>
              {t('dashboard.transferBetweenPools')}
            </Text>
          </TouchableOpacity>

          <SegmentedTabs<PaycheckTabSegment>
            tabs={[
              { key: 'EVENTS', label: t('transactions.tabs.pendingList') },
              { key: 'SOURCES', label: t('transactions.tabs.setup') },
            ]}
            activeKey={activeSegment}
            onChange={setActiveSegment}
          />
        </View>

        {activeSegment === 'EVENTS' && (
          <UpcomingEventsTab
            rawIncomeEvents={rawIncomeEvents}
            rawExpenseEvents={rawExpenseEvents}
            rawTransferEvents={rawTransferEvents}
            bankAccounts={bankAccounts}
            pools={pools}
            onOpenPaydayWizard={(eventId) => {
              router.push(`/(app)/paychecks/${eventId}` as any);
            }}
            onMarkExpensePaid={(eventId, amount) => {
              const expense = rawExpenseEvents.find((e) => e.id === eventId);
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
            onEditExpense={(expense) => {
              const fullExpense = rawExpenseEvents.find((e) => e.id === expense.id);
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
            onEditIncome={(income) => {
              const fullIncome = rawIncomeEvents.find((e) => e.id === income.id);
              if (fullIncome) {
                setEventToOverride({
                  id: fullIncome.id,
                  eventType: 'INCOME',
                  name: fullIncome.name || 'Income',
                  expectedDate: fullIncome.expectedDate,
                  expectedAmount: fullIncome.expectedAmount,
                });
                setOverrideModalVisible(true);
              }
            }}
            onDeleteIncomeEvent={handleDeleteIncomeEvent}
            onDeleteExpenseEvent={handleDeleteExpenseEvent}
            onExecuteTransfer={handleOpenTransferModal}
            onDeleteTransferEvent={handleDeleteTransferEvent}
          />
        )}

        {activeSegment === 'SOURCES' && (
          <RecurringSchedulesTab
            incomeSources={incomeSources}
            expenseSources={expenseSources}
            bankAccounts={bankAccounts}
            pools={pools}
            isLoadingIncome={isLoadingIncome}
            isLoadingExpense={isLoadingExpense}
            onAddSchedule={(mode) => {
              setSourceToEdit(null);
              setFormMode(mode);
              setFormModalVisible(true);
            }}
            onEditSchedule={(source, mode) => {
              setSourceToEdit(source);
              setFormMode(mode);
              setFormModalVisible(true);
            }}
            onBurstModal={handleOpenBurstModal}
          />
        )}
      </ScrollView>

      <PaychecksModalManager
        formModalVisible={formModalVisible}
        formMode={formMode}
        sourceToEdit={sourceToEdit}
        onCloseForm={() => setFormModalVisible(false)}
        markPaidEvent={markPaidEvent}
        onCloseMarkPaid={() => setMarkPaidEvent(null)}
        overrideModalVisible={overrideModalVisible}
        eventToOverride={eventToOverride}
        onCloseOverride={() => setOverrideModalVisible(false)}
        transferModalVisible={transferModalVisible}
        activeTransfer={activeTransfer}
        pools={pools.map((p) => ({
          id: p.id,
          name: p.name,
          poolType: p.poolType,
          currentBalance: p.currentBalance,
          isPrivate: p.isPrivate,
        }))}
        onCloseTransfer={() => {
          setTransferModalVisible(false);
          setActiveTransfer(null);
        }}
        categoryModalVisible={categoryModalVisible}
        activeCategoryDetail={activeCategoryDetail}
        onCloseCategoryDetail={() => {
          setCategoryModalVisible(false);
          setActiveCategoryDetail(null);
        }}
        burstModalVisible={burstModalVisible}
        burstSource={burstSource}
        burstMode={burstMode}
        burstEvents={burstEvents}
        onCloseBurst={() => {
          setBurstModalVisible(false);
          setBurstSource(null);
        }}
        onEditBurstSchedule={(src) => {
          setBurstModalVisible(false);
          setSourceToEdit(src as unknown as SourceToEdit);
          setFormMode(burstMode);
          setFormModalVisible(true);
        }}
        onRefresh={onRefresh}
        refetchAll={refetchAll}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
  topControlSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  transferButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
  },
});
