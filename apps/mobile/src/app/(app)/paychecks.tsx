import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';

import { IncomeExpenseFormModal, SourceToEdit } from '../../components/IncomeExpenseFormModal';
import { SourceBurstDetailModal } from '../../components/SourceBurstDetailModal';
import { UpcomingExpenseModal } from '../../components/UpcomingExpenseModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';
import { PaycheckEventSection, PaycheckIncomeEvent, PaycheckExpenseEvent } from '../../components/paychecks/PaycheckEventSection';
import { IncomeSourceCard, IncomeSourceItem } from '../../components/paychecks/IncomeSourceCard';
import { ExpenseBillCard, ExpenseSourceItem } from '../../components/paychecks/ExpenseBillCard';


export default function IncomeAndExpensesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listPools.useQuery();

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const [activeSegment, setActiveSegment] = useState<'EVENTS' | 'SOURCES'>('EVENTS');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<SourceToEdit | null>(null);

  const [burstModalVisible, setBurstModalVisible] = useState(false);
  const [burstMode, setBurstMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [burstSourceId, setBurstSourceId] = useState<string | null>(null);
  const [burstSourceName, setBurstSourceName] = useState('');
  const [burstSourceAmount, setBurstSourceAmount] = useState('');
  const [burstCategoryName, setBurstCategoryName] = useState('');

  const [upcomingExpenseToEdit, setUpcomingExpenseToEdit] = useState<PaycheckExpenseEvent | null>(null);
  const [upcomingIncomeToEdit, setUpcomingIncomeToEdit] = useState<PaycheckIncomeEvent | null>(null);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);


  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      incomeSourcesQuery.refetch();
      incomeEventsQuery.refetch();
    },
  });

  const deleteUpcomingMut = trpc.deleteUpcomingEvent.useMutation({
    onSuccess: () => {
      expenseSourcesQuery.refetch();
      expenseEventsQuery.refetch();
    },
  });

  const markPaidMutation = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
    },
  });

  const handleArchiveIncome = (inc: IncomeSourceItem) => {
    Alert.alert('Archive Income Stream', `Archive "${inc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => archiveIncomeMut.mutate({ id: inc.id }) },
    ]);
  };

  const handleArchiveExpense = (exp: ExpenseSourceItem) => {
    Alert.alert('Archive Expense Bill', `Archive "${exp.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => deleteUpcomingMut.mutate({ eventId: exp.id, eventType: 'EXPENSE' }) },
    ]);
  };

  const incomeEventsList = (incomeEventsQuery.data ?? []).filter((e) => e.status === 'UPCOMING');
  const expenseEventsList = (expenseEventsQuery.data ?? []).filter((e) => e.status === 'UPCOMING');


  return (
    <View style={styles.container}>
      <MobileScreenWrapper
        title={t('nav.incomeExpenses', { defaultValue: 'Income & Expenses' })}
        user={session?.user}
        onNavigateHome={() => router.push('/(app)/home')}
        onNavigateCategories={() => router.push('/(app)/categories')}
        onNavigateSettings={() => router.push('/(app)/settings')}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 14 }}>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              onPress={() => setActiveSegment('EVENTS')}
              style={[styles.segmentBtn, activeSegment === 'EVENTS' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentBtnText, activeSegment === 'EVENTS' && styles.segmentBtnTextActive]}>
                Upcoming Events ({incomeEventsList.length + expenseEventsList.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSegment('SOURCES')}
              style={[styles.segmentBtn, activeSegment === 'SOURCES' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentBtnText, activeSegment === 'SOURCES' && styles.segmentBtnTextActive]}>
                Sources & Bills ({incomeSources.length + expenseSources.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeSegment === 'EVENTS' ? (
            <PaycheckEventSection
              incomeEvents={incomeEventsList}
              expenseEvents={expenseEventsList}
              onOpenPaydayWizard={(eventId) => setPaydayWizardEventId(eventId)}
              onEditUpcomingExpense={(evt) => setUpcomingExpenseToEdit(evt)}
              onMarkExpensePaid={(eventId, amt) => markPaidMutation.mutate({ eventId, eventType: 'EXPENSE', actualAmount: String(amt), status: 'PAID' })}
            />
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionHeader}>INCOME STREAMS</Text>
              {incomeSources.map((inc) => (
                <IncomeSourceCard
                  key={inc.id}
                  inc={inc}
                  onEdit={() => { setFormMode('INCOME'); setSourceToEdit(inc); setFormModalVisible(true); }}
                  onArchive={() => handleArchiveIncome(inc)}
                  onViewBurst={() => { setBurstMode('INCOME'); setBurstSourceId(inc.id); setBurstSourceName(inc.name); setBurstSourceAmount(inc.amount); setBurstCategoryName('Income'); setBurstModalVisible(true); }}
                />
              ))}

              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>EXPENSE BILLS</Text>
              {expenseSources.map((exp) => {
                const cat = categories.find((c) => c.id === exp.categoryId);
                return (
                  <ExpenseBillCard
                    key={exp.id}
                    exp={exp}
                    categoryName={cat?.name || 'Unassigned'}
                    onEdit={() => { setFormMode('EXPENSE'); setSourceToEdit(exp); setFormModalVisible(true); }}
                    onArchive={() => handleArchiveExpense(exp)}
                    onViewBurst={() => { setBurstMode('EXPENSE'); setBurstSourceId(exp.id); setBurstSourceName(exp.name); setBurstSourceAmount(exp.amount); setBurstCategoryName(cat?.name || 'Unassigned'); setBurstModalVisible(true); }}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setFormMode('INCOME'); setSourceToEdit(null); setFormModalVisible(true); }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>

        <IncomeExpenseFormModal
          visible={formModalVisible}
          mode={formMode}
          sourceToEdit={sourceToEdit}
          onClose={() => setFormModalVisible(false)}
          onSuccess={() => { incomeSourcesQuery.refetch(); expenseSourcesQuery.refetch(); incomeEventsQuery.refetch(); expenseEventsQuery.refetch(); }}
        />

        <SourceBurstDetailModal
          visible={burstModalVisible}
          mode={burstMode}
          sourceId={burstSourceId}
          sourceName={burstSourceName}
          sourceAmount={burstSourceAmount}
          categoryName={burstCategoryName}
          onClose={() => setBurstModalVisible(false)}
        />

        <UpcomingExpenseModal
          visible={!!upcomingExpenseToEdit}
          eventToEdit={upcomingExpenseToEdit}
          onClose={() => setUpcomingExpenseToEdit(null)}
          onSuccess={() => { incomeEventsQuery.refetch(); expenseEventsQuery.refetch(); }}
        />

        <PaydayPreviewWizard
          visible={!!paydayWizardEventId || !!upcomingIncomeToEdit}
          incomeEventId={paydayWizardEventId}
          eventToEdit={upcomingIncomeToEdit}
          onClose={() => { setPaydayWizardEventId(null); setUpcomingIncomeToEdit(null); }}
          onSuccess={() => { incomeEventsQuery.refetch(); categoriesQuery.refetch(); }}
        />
      </MobileScreenWrapper>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginVertical: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#1B2B4B' },
  segmentBtnText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  segmentBtnTextActive: { color: '#FFF' },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: D.colors.textMuted, letterSpacing: 0.5 },
  fab: { position: 'absolute', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28, backgroundColor: D.colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 6 },
});
