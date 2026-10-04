import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../../../components/IncomeExpenseFormModal';
import { RecurringSchedulesTab } from '../../../components/paychecks/RecurringSchedulesTab';
import { usePaychecksData } from '../../../components/paychecks/usePaychecksData';
import { BurstSourceItem, BurstEventItem } from '../../../components/paychecks/MobileBurstModal';
import { IncomeSourceItem } from '../../../components/paychecks/IncomeSourceCard';
import { ExpenseSourceItem } from '../../../components/paychecks/ExpenseBillCard';
import { PaychecksModalManager } from '../../../components/paychecks/PaychecksModalManager';

export default function RecurringSchedulesScreen() {
  const router = useRouter();

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

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
    isLoadingIncome,
    isLoadingExpense,
    refetchAll,
  } = usePaychecksData();

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
      title={t('transactions.tabs.setup')}
      showBack={true}
      onBackPress={() => router.back()}
      scrollable={false}
      infoTooltip={{
        title: t('transactions.tabs.setup'),
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
      </ScrollView>

      <PaychecksModalManager
        formModalVisible={formModalVisible}
        formMode={formMode}
        sourceToEdit={sourceToEdit}
        onCloseForm={() => setFormModalVisible(false)}
        markPaidEvent={null}
        onCloseMarkPaid={() => {}}
        overrideModalVisible={false}
        eventToOverride={null}
        onCloseOverride={() => {}}
        transferModalVisible={false}
        activeTransfer={null}
        pools={pools.map((p) => ({
          id: p.id,
          name: p.name,
          poolType: p.poolType,
          currentBalance: p.currentBalance,
          isPrivate: p.isPrivate,
        }))}
        onCloseTransfer={() => {}}
        categoryModalVisible={false}
        activeCategoryDetail={null}
        onCloseCategoryDetail={() => {}}
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
    paddingTop: 12,
    paddingBottom: 90,
  },
});
