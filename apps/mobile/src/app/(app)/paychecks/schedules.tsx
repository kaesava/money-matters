import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../../../components/IncomeExpenseFormModal';
import { RecurringSchedulesTab } from '../../../components/paychecks/RecurringSchedulesTab';
import { usePaychecksData } from '../../../components/paychecks/usePaychecksData';
import { BurstSourceItem, BurstEventItem } from '../../../components/paychecks/MobileBurstModal';
import { IncomeSourceItem } from '../../../components/paychecks/IncomeSourceCard';
import { ExpenseSourceItem } from '../../../components/paychecks/ExpenseBillCard';
import { PaychecksModalManager } from '../../../components/paychecks/PaychecksModalManager';

import { EnvelopeFormModal, EnvelopeItem as PoolToEdit } from '../../../components/EnvelopeFormModal';
import { QuickExpenseModal, QuickActionType } from '../../../components/QuickExpenseModal';

export default function RecurringSchedulesScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ returnTo?: string }>();

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  // Category/Pool Modal State (for in-place bill envelope edit/create)
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [poolToEdit, setPoolToEdit] = useState<PoolToEdit | null>(null);

  // Quick Action Modal State (for one-off income/expense)
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickActionType, setQuickActionType] = useState<QuickActionType>('DEBIT');

  const handleBack = () => {
    if (searchParams.returnTo) {
      router.push(searchParams.returnTo as never);
    } else {
      router.back();
    }
  };

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
        name: evt.name,
        note: null,
      }));

  return (
    <AppScreenWrapper
      title={t('incomeBillsTabs.schedules')}
      showBack={true}
      onBackPress={handleBack}
      scrollable={false}
      infoTooltip={{
        title: t('incomeBillsTabs.schedules'),
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
            tintColor={DESIGN_TOKENS.colors.accent}
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
            if (mode === 'INCOME') {
              setSourceToEdit(null);
              setFormMode('INCOME');
              setFormModalVisible(true);
            } else {
              setPoolToEdit(null);
              setCategoryModalVisible(true);
            }
          }}
          onAddOneOff={(mode) => {
            setQuickActionType(mode === 'INCOME' ? 'CREDIT' : 'DEBIT');
            setQuickActionVisible(true);
          }}
          onEditSchedule={(source, mode) => {
            if (mode === 'INCOME') {
              setSourceToEdit(source);
              setFormMode('INCOME');
              setFormModalVisible(true);
            } else {
              const targetPool = pools.find((p) => p.id === source.id || p.id === source.poolId);
              const resolvedType = targetPool?.envelopeType || 'REGULAR';
              setPoolToEdit({
                id: source.id,
                name: source.name,
                type: resolvedType,
                poolType: resolvedType,
                envelopeType: resolvedType,
                bankAccountId: targetPool?.bankAccountId,
                monthlyAmount: source.amount,
                enteredAmount: source.amount,
                budgetFrequency: targetPool?.budgetFrequency || 'MONTHLY',
                rrule: source.rrule || targetPool?.rrule || undefined,
                startDate: source.startDate ? String(source.startDate) : targetPool?.startDate ? String(targetPool.startDate) : undefined,
                endDate: targetPool?.endDate ? String(targetPool.endDate) : undefined,
              });
              setCategoryModalVisible(true);
            }
          }}
          onBurstModal={handleOpenBurstModal}
        />
      </ScrollView>

      <EnvelopeFormModal
        visible={categoryModalVisible}
        envelopeToEdit={poolToEdit}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => {
          setCategoryModalVisible(false);
          refetchAll();
        }}
      />

      <QuickExpenseModal
        visible={quickActionVisible}
        initialType={quickActionType}
        onClose={() => setQuickActionVisible(false)}
        onSuccess={() => {
          setQuickActionVisible(false);
          refetchAll();
        }}
      />

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
          poolType: p.envelopeType,
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
