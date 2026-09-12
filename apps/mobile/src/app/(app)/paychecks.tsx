import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';

import { MobileMatrixPlanTab } from '../../components/paychecks/MobileMatrixPlanTab';
import { IncomeExpenseFormModal, SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { SourceBurstDetailModal } from '../../components/SourceBurstDetailModal';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { EventOverrideModal } from '../../components/EventOverrideModal';
import { PaycheckEventSection, PaycheckIncomeEvent, PaycheckExpenseEvent } from '../../components/paychecks/PaycheckEventSection';
import { IncomeSourceCard, IncomeSourceItem } from '../../components/paychecks/IncomeSourceCard';
import { ExpenseBillCard, ExpenseSourceItem } from '../../components/paychecks/ExpenseBillCard';
import { showMobileConfirm } from '../../components/MobileConfirmDialog';

export type PaycheckTabSegment = 'MATRIX' | 'EVENTS' | 'SOURCES';

export default function IncomeAndBillsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const [activeSegment, setActiveSegment] = useState<PaycheckTabSegment>('MATRIX');
  const [refreshing, setRefreshing] = useState(false);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  const [burstModalVisible, setBurstModalVisible] = useState(false);
  const [burstMode, setBurstMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [burstSourceId, setBurstSourceId] = useState<string | null>(null);
  const [burstSourceName, setBurstSourceName] = useState('');
  const [burstSourceAmount, setBurstSourceAmount] = useState('');
  const [burstCategoryName, setBurstCategoryName] = useState('');

  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [eventToOverride, setEventToOverride] = useState<PaycheckExpenseEvent | null>(null);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const poolsQuery = trpc.listPools.useQuery();

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const pools = poolsQuery.data ?? [];

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      incomeSourcesQuery.refetch();
      incomeEventsQuery.refetch();
    },
  });

  const archiveExpenseMut = trpc.deleteUpcomingEvent.useMutation({
    onSuccess: () => {
      expenseSourcesQuery.refetch();
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
    ]);
    setRefreshing(false);
  };

  const handleArchiveIncome = (inc: IncomeSourceItem) => {
    showMobileConfirm({
      title: 'Archive Income Schedule',
      message: `Are you sure you want to archive "${inc.name}"?`,
      confirmText: 'Archive',
      onConfirm: () => archiveIncomeMut.mutate({ id: inc.id }),
    });
  };

  const handleArchiveExpense = (exp: ExpenseSourceItem) => {
    showMobileConfirm({
      title: 'Archive Expense Bill',
      message: `Are you sure you want to archive "${exp.name}"?`,
      confirmText: 'Archive',
      onConfirm: () =>
        archiveExpenseMut.mutate({ eventId: exp.id, eventType: 'EXPENSE' }),
    });
  };

  const incomeEventsList = (incomeEventsQuery.data ?? []).filter(
    (e) => e.status === 'PENDING'
  );
  const expenseEventsList = (expenseEventsQuery.data ?? []).filter(
    (e) => e.status === 'PENDING'
  );

  return (
    <MobileScreenWrapper
      title={t('nav.payday') || 'Income & Bills'}
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
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
        {/* 3-Way Segmented Navigation Header */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'MATRIX' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveSegment('MATRIX')}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'MATRIX' && styles.segmentTextActive,
              ]}
            >
              📊 12M Matrix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'EVENTS' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveSegment('EVENTS')}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'EVENTS' && styles.segmentTextActive,
              ]}
            >
              📅 Timeline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'SOURCES' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveSegment('SOURCES')}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'SOURCES' && styles.segmentTextActive,
              ]}
            >
              🔄 Schedules
            </Text>
          </TouchableOpacity>
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
                  setEventToOverride(fullExpense);
                  setOverrideModalVisible(true);
                }
              }}
            />
          </View>
        )}

        {/* View 3: Recurring Schedules */}
        {activeSegment === 'SOURCES' && (
          <View style={styles.sourcesView}>
            {/* Income Schedules section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Income Schedules</Text>
              <TouchableOpacity
                onPress={() => {
                  setSourceToEdit(null);
                  setFormMode('INCOME');
                  setFormModalVisible(true);
                }}
                style={styles.addScheduleBtn}
              >
                <Feather name="plus" size={14} color="#2563eb" />
                <Text style={styles.addScheduleText}>Add Income</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardsStack}>
              {incomeSources.map((inc) => (
                <IncomeSourceCard
                  key={inc.id}
                  inc={inc}
                  onEdit={(s: IncomeSourceItem) => {
                    setSourceToEdit(s);
                    setFormMode('INCOME');
                    setFormModalVisible(true);
                  }}
                  onArchive={handleArchiveIncome}
                  onViewBurst={(s: IncomeSourceItem) => {
                    setBurstSourceId(s.id);
                    setBurstSourceName(s.name);
                    setBurstSourceAmount(s.amount);
                    setBurstCategoryName('Everyday Pool');
                    setBurstMode('INCOME');
                    setBurstModalVisible(true);
                  }}
                />
              ))}
            </View>

            {/* Expense Bills section */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionHeaderTitle}>Expense Bills</Text>
              <TouchableOpacity
                onPress={() => {
                  setSourceToEdit(null);
                  setFormMode('EXPENSE');
                  setFormModalVisible(true);
                }}
                style={styles.addScheduleBtn}
              >
                <Feather name="plus" size={14} color="#ba1a1a" />
                <Text style={[styles.addScheduleText, { color: '#ba1a1a' }]}>
                  Add Bill
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardsStack}>
              {expenseSources.map((exp) => (
                <ExpenseBillCard
                  key={exp.id}
                  exp={exp}
                  categoryName={exp.poolName || exp.categoryName || 'Pool'}
                  onEdit={(s: ExpenseSourceItem) => {
                    setSourceToEdit(s);
                    setFormMode('EXPENSE');
                    setFormModalVisible(true);
                  }}
                  onArchive={handleArchiveExpense}
                  onViewBurst={(s: ExpenseSourceItem) => {
                    setBurstSourceId(s.id);
                    setBurstSourceName(s.name);
                    setBurstSourceAmount(s.amount);
                    setBurstCategoryName(s.name || 'Pool');
                    setBurstMode('EXPENSE');
                    setBurstModalVisible(true);
                  }}
                />
              ))}
            </View>
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

      {/* Burst Future Occurrences Modal */}
      <SourceBurstDetailModal
        visible={burstModalVisible}
        sourceId={burstSourceId}
        sourceName={burstSourceName}
        sourceAmount={burstSourceAmount}
        categoryName={burstCategoryName}
        mode={burstMode}
        onClose={() => setBurstModalVisible(false)}
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
                eventType: 'EXPENSE',
                name: eventToOverride.name || 'Expense',
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
    </MobileScreenWrapper>
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
});
