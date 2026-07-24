import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper, MobileFilterBar } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { IncomeExpenseFormModal } from '../../components/IncomeExpenseFormModal';
import { SourceBurstDetailModal } from '../../components/SourceBurstDetailModal';
import { EventOverrideModal, EventToOverride } from '../../components/EventOverrideModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';

export default function IncomeAndExpensesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Segment State: 'EVENTS' vs 'SOURCES'
  const [activeSegment, setActiveSegment] = useState<'EVENTS' | 'SOURCES'>('EVENTS');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [sourceToEdit, setSourceToEdit] = useState<any>(null);

  const [burstModalVisible, setBurstModalVisible] = useState(false);
  const [burstMode, setBurstMode] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [burstSourceId, setBurstSourceId] = useState<string | null>(null);
  const [burstSourceName, setBurstSourceName] = useState('');
  const [burstSourceAmount, setBurstSourceAmount] = useState('');
  const [burstCategoryName, setBurstCategoryName] = useState('');

  const [eventToOverride, setEventToOverride] = useState<EventToOverride | null>(null);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);

  // Queries
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      incomeSourcesQuery.refetch();
      incomeEventsQuery.refetch();
    },
  });

  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation({
    onSuccess: () => {
      expenseSourcesQuery.refetch();
      expenseEventsQuery.refetch();
    },
  });

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
    },
  });

  const handleArchiveIncome = (inc: any) => {
    Alert.alert('Archive Income Source', `Are you sure you want to archive "${inc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveIncomeMut.mutateAsync({ id: inc.id });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  const handleArchiveExpense = (exp: any) => {
    Alert.alert('Archive Expense Bill', `Are you sure you want to archive "${exp.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveExpenseMut.mutateAsync({ id: exp.id });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  // Filter Events
  const incomeEventsList = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({
      id: e.id,
      type: 'INCOME' as const,
      name: e.sourceName || 'Paycheck Deposit',
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: 'Income Allocation',
    }));

  const expenseEventsList = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({
      id: e.id,
      type: 'EXPENSE' as const,
      name: e.name,
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: e.categoryName || 'Uncategorized',
    }));

  let combinedEvents = [...incomeEventsList, ...expenseEventsList];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    combinedEvents = combinedEvents.filter((e) => e.name.toLowerCase().includes(q) || e.categoryName.toLowerCase().includes(q));
  }
  combinedEvents.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  // Filter Sources
  const filteredIncomeSources = incomeSources.filter((i) => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredExpenseSources = expenseSources.filter((e) => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const D = DESIGN_TOKENS;

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
          {/* Top Segmented Controls */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              onPress={() => setActiveSegment('EVENTS')}
              style={[styles.segmentBtn, activeSegment === 'EVENTS' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentBtnText, activeSegment === 'EVENTS' && styles.segmentBtnTextActive]}>
                Upcoming Events ({combinedEvents.length})
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

          {/* Action Row for Creating Sources */}
          {activeSegment === 'SOURCES' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  setFormMode('INCOME');
                  setSourceToEdit(null);
                  setFormModalVisible(true);
                }}
                style={[styles.createBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>💰 Add Income Source</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setFormMode('EXPENSE');
                  setSourceToEdit(null);
                  setFormModalVisible(true);
                }}
                style={[styles.createBtn, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F766E' }}>💸 Add Expense Bill</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Filter Bar */}
          <MobileFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search deposit, bill, or category..."
          />

          {/* SEGMENT 1: UPCOMING EVENTS */}
          {activeSegment === 'EVENTS' && (
            <View style={styles.section}>
              {incomeEventsQuery.isLoading || expenseEventsQuery.isLoading ? (
                <ActivityIndicator color={D.colors.accent} style={{ marginTop: 20 }} />
              ) : combinedEvents.length === 0 ? (
                <Text style={styles.emptyText}>No upcoming events found.</Text>
              ) : (
                combinedEvents.map((evt) => (
                  <View key={`${evt.type}-${evt.id}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{evt.name}</Text>
                        <Text style={styles.cardSubtitle}>
                          {new Date(evt.expectedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} • {evt.categoryName}
                        </Text>
                      </View>
                      <Text style={[styles.amountText, evt.type === 'INCOME' && { color: '#10B981' }]}>
                        {evt.type === 'INCOME' ? '+' : '-'}{formatAUD(evt.expectedAmount)}
                      </Text>
                    </View>

                    <View style={styles.eventActionRow}>
                      <TouchableOpacity
                        onPress={() =>
                          setEventToOverride({
                            id: evt.id,
                            eventType: evt.type,
                            name: evt.name,
                            expectedDate: evt.expectedDate,
                            expectedAmount: evt.expectedAmount,
                          })
                        }
                        style={styles.editBtn}
                      >
                        <Text style={styles.editBtnText}>Edit Override</Text>
                      </TouchableOpacity>

                      {evt.type === 'INCOME' ? (
                        <TouchableOpacity onPress={() => setPaydayWizardEventId(evt.id)} style={styles.processBtn}>
                          <Text style={styles.processBtnText}>Process Waterfall ⚡</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => markPaidMutation.mutate({ eventId: evt.id, actualAmount: evt.expectedAmount, note: `Paid ${evt.name}` })}
                          style={styles.markPaidBtn}
                        >
                          <Text style={styles.markPaidBtnText}>Mark Paid ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SEGMENT 2: SOURCES & BILLS */}
          {activeSegment === 'SOURCES' && (
            <View style={{ gap: 16 }}>
              {/* Income Sources Section */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>💵 Income Sources ({filteredIncomeSources.length})</Text>
                {filteredIncomeSources.length === 0 ? (
                  <Text style={styles.emptyText}>No income sources configured.</Text>
                ) : (
                  filteredIncomeSources.map((inc) => (
                    <View key={inc.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <TouchableOpacity
                          onPress={() => {
                            setBurstMode('INCOME');
                            setBurstSourceId(inc.id);
                            setBurstSourceName(inc.name);
                            setBurstSourceAmount(inc.amount);
                            setBurstCategoryName('');
                            setBurstModalVisible(true);
                          }}
                        >
                          <Text style={[styles.cardTitle, { color: '#00B4A6' }]}>{inc.name} 🔗</Text>
                          <Text style={styles.cardSubtitle}>{inc.rrule || 'One-off schedule'}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.amountText, { color: '#10B981' }]}>{formatAUD(inc.amount)}</Text>
                      </View>

                      <View style={styles.eventActionRow}>
                        <TouchableOpacity
                          onPress={() => {
                            setFormMode('INCOME');
                            setSourceToEdit(inc);
                            setFormModalVisible(true);
                          }}
                          style={styles.editBtn}
                        >
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleArchiveIncome(inc)} style={styles.archiveBtn}>
                          <Text style={styles.archiveBtnText}>Archive</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Expense Bills Section */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>💳 Expense Bills ({filteredExpenseSources.length})</Text>
                {filteredExpenseSources.length === 0 ? (
                  <Text style={styles.emptyText}>No expense bills configured.</Text>
                ) : (
                  filteredExpenseSources.map((exp) => {
                    const cat = categories.find((c) => c.id === exp.categoryId);
                    return (
                      <View key={exp.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <TouchableOpacity
                            onPress={() => {
                              setBurstMode('EXPENSE');
                              setBurstSourceId(exp.id);
                              setBurstSourceName(exp.name);
                              setBurstSourceAmount(exp.amount);
                              setBurstCategoryName(cat?.name || 'Unassigned');
                              setBurstModalVisible(true);
                            }}
                          >
                            <Text style={[styles.cardTitle, { color: '#00B4A6' }]}>{exp.name} 🔗</Text>
                            <Text style={styles.cardSubtitle}>
                              Category: {cat?.name || 'Unassigned'} • {exp.rrule || 'One-off'}
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.amountText}>{formatAUD(exp.amount)}</Text>
                        </View>

                        <View style={styles.eventActionRow}>
                          <TouchableOpacity
                            onPress={() => {
                              setFormMode('EXPENSE');
                              setSourceToEdit(exp);
                              setFormModalVisible(true);
                            }}
                            style={styles.editBtn}
                          >
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleArchiveExpense(exp)} style={styles.archiveBtn}>
                            <Text style={styles.archiveBtnText}>Archive</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </MobileScreenWrapper>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setFormMode('INCOME');
          setSourceToEdit(null);
          setFormModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Income & Expense Form Modal */}
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

      {/* Source Burst Detail Modal */}
      <SourceBurstDetailModal
        visible={burstModalVisible}
        mode={burstMode}
        sourceId={burstSourceId}
        sourceName={burstSourceName}
        sourceAmount={burstSourceAmount}
        categoryName={burstCategoryName}
        onClose={() => setBurstModalVisible(false)}
      />

      {/* Event Override Modal */}
      <EventOverrideModal
        visible={!!eventToOverride}
        eventToEdit={eventToOverride}
        onClose={() => setEventToOverride(null)}
        onSuccess={() => {
          incomeEventsQuery.refetch();
          expenseEventsQuery.refetch();
        }}
      />

      {/* Payday Preview Wizard */}
      <PaydayPreviewWizard
        visible={!!paydayWizardEventId}
        incomeEventId={paydayWizardEventId}
        onClose={() => setPaydayWizardEventId(null)}
        onSuccess={() => {
          incomeEventsQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
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
  actionRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  createBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  section: { gap: 8 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: D.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { textAlign: 'center', fontSize: 12, color: D.colors.textMuted, marginVertical: 20 },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: D.colors.primary },
  cardSubtitle: { fontSize: 10, color: D.colors.textMuted, marginTop: 2 },
  amountText: { fontSize: 14, fontWeight: '800', color: D.colors.primary },
  eventActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  editBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  editBtnText: { fontSize: 10, fontWeight: '700', color: D.colors.textPrimary },
  processBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#00B4A6' },
  processBtnText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  markPaidBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1B2B4B' },
  markPaidBtnText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  archiveBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEE2E2' },
  archiveBtnText: { fontSize: 10, fontWeight: '700', color: '#991B1B' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: D.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
