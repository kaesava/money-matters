import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';
import { SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { UpcomingEventsTab } from '../../components/plan/UpcomingEventsTab';
import { usePaychecksData } from '../../components/plan/usePaychecksData';
import { PaycheckTransferEvent } from '../../components/plan/PaycheckEventSection';
import { PaychecksModalManager } from '../../components/plan/PaychecksModalManager';
import { BurstEventItem } from '../../components/plan/MobileBurstModal';
import { PaychecksSchedulesBanner } from '../../components/plan/overview/PaychecksSchedulesBanner';
import { usePaychecksModalController } from '../../components/plan/hooks/usePaychecksModalController';
import { EnvelopeOverflowMenuModal } from '../../components/envelopes/EnvelopeOverflowMenuModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';

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
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [quickExpenseModalVisible, setQuickExpenseModalVisible] = useState(false);
  const [quickExpenseInitialType, setQuickExpenseInitialType] = useState<'DEBIT' | 'CREDIT' | 'TRANSFER'>('TRANSFER');

  const {
    refreshing,
    onRefresh,
    incomeSources,
    pools,
    bankAccounts,
    rawIncomeEvents,
    rawExpenseEvents,
    rawTransferEvents,
    savedIncomeEventIds,
    handleDeleteIncomeEvent,
    handleDeleteExpenseEvent,
    handleDeleteTransferEvent,
    refetchAll,
  } = usePaychecksData();

  const handleBack = () => {
    if (searchParams.returnTo) {
      router.push(searchParams.returnTo as Href);
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
              `/(app)/plan/schedules?returnTo=${encodeURIComponent(
                searchParams.returnTo || '/(app)/plan'
              )}` as Href
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
          savedIncomeEventIds={savedIncomeEventIds}
          onOpenOverflowMenu={() => setOverflowMenuVisible(true)}
          initialKind={initialKind}
          initialPoolId={searchParams.poolId}
          initialCategoryId={searchParams.categoryId}
          onOpenPaydayWizard={(eventId) => {
            router.push(`/(app)/payday-plan/${eventId}` as Href);
          }}
          onMarkExpensePaid={(eventId, amount) => {
            const expense = rawExpenseEvents.find((e) => e.id === eventId);
            if (expense) {
              modals.setMarkPaidEvent({
                id: expense.id,
                name: expense.name || 'Expense',
                expectedAmount: parseFloat(amount),
                expectedDate: expense.expectedDate,
                poolId: expense.envelopeId,
                categoryId: expense.envelopeId,
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
                envelopeId: fullExpense.envelopeId,
                poolId: fullExpense.envelopeId,
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
                incomeSourceId: fullIncome.incomeSourceId,
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
        onNavigateToSchedule={(type, id) => {
          if (type === 'INCOME') {
            router.push(
              `/(app)/plan/schedules?editIncomeId=${id}&returnTo=${encodeURIComponent('/(app)/plan')}` as Href
            );
          } else {
            router.push(
              `/(app)/plan/schedules?editBillId=${id}&returnTo=${encodeURIComponent('/(app)/plan')}` as Href
            );
          }
        }}
        transferModalVisible={modals.transferModalVisible}
        activeTransfer={modals.activeTransfer}
        pools={pools.map((p) => ({
          id: p.id,
          name: p.name,
          envelopeType: p.envelopeType,
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

      <EnvelopeOverflowMenuModal
        visible={overflowMenuVisible}
        onClose={() => setOverflowMenuVisible(false)}
        showExtraActions={false}
        onQuickExpense={() => {
          setQuickExpenseInitialType('DEBIT');
          setQuickExpenseModalVisible(true);
        }}
        onQuickIncome={() => {
          setQuickExpenseInitialType('CREDIT');
          setQuickExpenseModalVisible(true);
        }}
        onMoveMoney={() => {
          setQuickExpenseInitialType('TRANSFER');
          setQuickExpenseModalVisible(true);
        }}
      />

      <QuickExpenseModal
        visible={quickExpenseModalVisible}
        initialType={quickExpenseInitialType}
        onClose={() => setQuickExpenseModalVisible(false)}
        onSuccess={() => refetchAll()}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
});
