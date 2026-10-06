import React from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { UpcomingEventsTab } from '../../components/paychecks/UpcomingEventsTab';
import { usePaychecksData } from '../../components/paychecks/usePaychecksData';
import { PaycheckTransferEvent } from '../../components/paychecks/PaycheckEventSection';
import { PaychecksModalManager } from '../../components/paychecks/PaychecksModalManager';
import { BurstEventItem } from '../../components/paychecks/MobileBurstModal';
import { PaychecksSchedulesBanner } from '../../components/paychecks/overview/PaychecksSchedulesBanner';
import { usePaychecksModalController } from '../../components/paychecks/hooks/usePaychecksModalController';

export default function IncomeAndBillsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    tab?: string;
    type?: string;
    poolId?: string;
    categoryId?: string;
    returnTo?: string;
  }>();

  const initialKind = searchParams.type?.toUpperCase() === 'EXPENSE'
    ? 'EXPENSE'
    : searchParams.type?.toUpperCase() === 'INCOME'
    ? 'INCOME'
    : undefined;

  const modals = usePaychecksModalController();

  const {
    refreshing,
    onRefresh,
    incomeSources,
    pools,
    bankAccounts,
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    handleDeleteIncomeEvent,
    handleDeleteExpenseEvent,
    handleDeleteTransferEvent,
    refetchAll,
  } = usePaychecksData();

  const handleBack = () => {
    if (searchParams.returnTo) {
      router.push(searchParams.returnTo as never);
    } else {
      router.back();
    }
  };

  const handleOpenTransferModal = (transferItem: PaycheckTransferEvent) => {
    modals.setActiveTransfer({
      id: transferItem.id,
      name: transferItem.name || t('common.transfer'),
      expectedAmount: transferItem.expectedAmount,
      expectedDate: transferItem.expectedDate,
      sourcePoolId: transferItem.sourcePoolId,
      sourcePoolName: transferItem.sourcePoolName,
      destinationPoolId: transferItem.destinationPoolId,
      destinationPoolName: transferItem.destinationPoolName,
    });
    modals.setTransferModalVisible(true);
  };

  const burstEvents: BurstEventItem[] = modals.burstMode === 'INCOME'
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
      showBack={Boolean(searchParams.returnTo)}
      onBackPress={handleBack}
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
            tintColor={DESIGN_TOKENS.colors.accent}
          />
        }
      >
        <PaychecksSchedulesBanner
          onPress={() =>
            router.push(
              `/(app)/paychecks/schedules?returnTo=${encodeURIComponent(
                searchParams.returnTo || '/(app)/paychecks'
              )}` as never
            )
          }
        />

        <UpcomingEventsTab
          rawIncomeEvents={rawIncomeEvents}
          rawExpenseEvents={rawExpenseEvents}
          rawTransferEvents={rawTransferEvents}
          bankAccounts={bankAccounts}
          pools={pools}
          incomeSources={incomeSources}
          initialKind={initialKind}
          initialPoolId={searchParams.poolId}
          initialCategoryId={searchParams.categoryId}
          onOpenPaydayWizard={(eventId) => {
            router.push(`/(app)/paychecks/${eventId}` as any);
          }}
          onMarkExpensePaid={(eventId, amount) => {
            const expense = rawExpenseEvents.find((e) => e.id === eventId);
            if (expense) {
              modals.setMarkPaidEvent({
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
              modals.setEventToOverride({
                id: fullExpense.id,
                eventType: 'EXPENSE',
                name: fullExpense.name || 'Expense',
                expectedDate: fullExpense.expectedDate,
                expectedAmount: fullExpense.expectedAmount,
              });
              modals.setOverrideModalVisible(true);
            }
          }}
          onEditIncome={(income) => {
            const fullIncome = rawIncomeEvents.find((e) => e.id === income.id);
            if (fullIncome) {
              modals.setEventToOverride({
                id: fullIncome.id,
                eventType: 'INCOME',
                name: fullIncome.name || 'Income',
                expectedDate: fullIncome.expectedDate,
                expectedAmount: fullIncome.expectedAmount,
              });
              modals.setOverrideModalVisible(true);
            }
          }}
          onDeleteIncomeEvent={handleDeleteIncomeEvent}
          onDeleteExpenseEvent={handleDeleteExpenseEvent}
          onExecuteTransfer={handleOpenTransferModal}
          onDeleteTransferEvent={handleDeleteTransferEvent}
        />
      </ScrollView>

      <PaychecksModalManager
        formModalVisible={modals.formModalVisible}
        formMode={modals.formMode}
        sourceToEdit={modals.sourceToEdit}
        onCloseForm={() => modals.setFormModalVisible(false)}
        markPaidEvent={modals.markPaidEvent}
        onCloseMarkPaid={() => modals.setMarkPaidEvent(null)}
        overrideModalVisible={modals.overrideModalVisible}
        eventToOverride={modals.eventToOverride}
        onCloseOverride={() => modals.setOverrideModalVisible(false)}
        transferModalVisible={modals.transferModalVisible}
        activeTransfer={modals.activeTransfer}
        pools={pools.map((p) => ({
          id: p.id,
          name: p.name,
          poolType: p.poolType,
          currentBalance: p.currentBalance,
          isPrivate: p.isPrivate,
        }))}
        onCloseTransfer={() => {
          modals.setTransferModalVisible(false);
          modals.setActiveTransfer(null);
        }}
        categoryModalVisible={modals.categoryModalVisible}
        activeCategoryDetail={modals.activeCategoryDetail}
        onCloseCategoryDetail={() => {
          modals.setCategoryModalVisible(false);
          modals.setActiveCategoryDetail(null);
        }}
        burstModalVisible={modals.burstModalVisible}
        burstSource={modals.burstSource}
        burstMode={modals.burstMode}
        burstEvents={burstEvents}
        onCloseBurst={() => {
          modals.setBurstModalVisible(false);
          modals.setBurstSource(null);
        }}
        onEditBurstSchedule={(src) => {
          modals.setBurstModalVisible(false);
          modals.setSourceToEdit(src as unknown as SourceToEdit);
          modals.setFormMode(modals.burstMode);
          modals.setFormModalVisible(true);
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
});
