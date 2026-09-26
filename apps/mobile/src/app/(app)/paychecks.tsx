import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SegmentedTabs } from '@money-matters/ui/mobile';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { t } from '@money-matters/i18n';

import { MobileMatrixPlanTab } from '../../components/paychecks/MobileMatrixPlanTab';
import { IncomeExpenseFormModal, SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { EventOverrideModal } from '../../components/EventOverrideModal';
import { UpcomingEventsTab } from '../../components/paychecks/UpcomingEventsTab';
import { RecurringSchedulesTab } from '../../components/paychecks/RecurringSchedulesTab';
import { usePaychecksData } from '../../components/paychecks/usePaychecksData';

export type PaycheckTabSegment = 'MATRIX' | 'EVENTS' | 'SOURCES';

interface IncomeAndBillsScreenProps {
  initialTab?: PaycheckTabSegment;
}

export default function IncomeAndBillsScreen({ initialTab }: IncomeAndBillsScreenProps = {}) {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();

  const resolvedInitialTab: PaycheckTabSegment = initialTab || (
    searchParams.tab?.toUpperCase() === 'EVENTS'
      ? 'EVENTS'
      : searchParams.tab?.toUpperCase() === 'SOURCES'
      ? 'SOURCES'
      : 'MATRIX'
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
    handleExecuteTransfer,
    refetchAll,
  } = usePaychecksData();

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

        {activeSegment === 'MATRIX' && <MobileMatrixPlanTab />}

        {activeSegment === 'EVENTS' && (
          <UpcomingEventsTab
            rawIncomeEvents={rawIncomeEvents}
            rawExpenseEvents={rawExpenseEvents}
            rawTransferEvents={rawTransferEvents}
            bankAccounts={bankAccounts}
            pools={pools}
            onOpenPaydayWizard={(eventId) => {
              router.push(`/(app)/quick?tab=payday&eventId=${eventId}` as any);
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
            onDeleteIncomeEvent={handleDeleteIncomeEvent}
            onDeleteExpenseEvent={handleDeleteExpenseEvent}
            onExecuteTransfer={handleExecuteTransfer}
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
          />
        )}
      </ScrollView>

      {/* Schedule Form Modal */}
      <IncomeExpenseFormModal
        visible={formModalVisible}
        mode={formMode}
        sourceToEdit={sourceToEdit}
        onClose={() => setFormModalVisible(false)}
        onSuccess={refetchAll}
      />

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={refetchAll}
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
        onSuccess={refetchAll}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
});
