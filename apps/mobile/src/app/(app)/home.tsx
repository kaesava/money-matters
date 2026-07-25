import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { EventOverrideModal, EventToOverride } from '../../components/EventOverrideModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';

export default function HomeScreen() {
  const router = useRouter();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  // Preferences
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Modals state
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);
  const [eventToOverride, setEventToOverride] = useState<EventToOverride | null>(null);

  // Can Afford State
  const [canAffordAmount, setCanAffordAmount] = useState('');

  // Reconcile Modal State
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(null);
  const [reconcileActualAmount, setReconcileActualAmount] = useState('');
  const [reconcileTargetCategoryId, setReconcileTargetCategoryId] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Upcoming Filters
  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [upcomingSearch, setUpcomingSearch] = useState('');

  const { data: session } = authClient.useSession();
  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const canAffordQuery = trpc.canAfford.useQuery(
    { amount: canAffordAmount },
    { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 }
  );

  useEffect(() => {
    if (userPrefQuery.data) {
      setIsQuickActionsOpen(!userPrefQuery.data.quickActionsCollapsed);
    }
  }, [userPrefQuery.data]);

  const handleToggleQuickActions = () => {
    const nextState = !isQuickActionsOpen;
    setIsQuickActionsOpen(nextState);
    updateUserPrefMutation.mutate({ quickActionsCollapsed: !nextState });
  };

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const confirmPaydayMutation = trpc.confirmPayday.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
      Alert.alert('Payday Allocated!', 'Payday split allocated successfully.');
    },
  });

  const reconcileMutation = trpc.reconcileBankBalance.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      categoriesQuery.refetch();
      setReconcileModalVisible(false);
    },
  });

  const categories = categoriesQuery.data ?? [];
  const atRiskCount = categories.filter((c) => c.healthStatus === 'AMBER').length;
  const missedCount = categories.filter((c) => c.healthStatus === 'RED').length;

  const handleQuickApprovePayday = (evt: any) => {
    confirmPaydayMutation.mutate({
      incomeEventId: evt.id,
      actualAmount: evt.expectedAmount,
      lines: [],
    });
  };

  const handleMarkPaid = (evt: any) => {
    const cat = categories.find((c) => c.id === evt.categoryId);
    const balance = cat ? parseFloat(cat.currentBalance) : 0;
    const amount = parseFloat(evt.expectedAmount);

    if (cat && balance < amount) {
      Alert.alert(
        'Overdrawn Warning',
        `Payment of ${formatAUD(amount)} exceeds "${cat.name}" balance (${formatAUD(balance)}). Category balance will become negative (${formatAUD(balance - amount)}). Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: () => markPaidMutation.mutate({ eventId: evt.id, actualAmount: evt.expectedAmount, note: `Paid ${evt.name}` }),
          },
        ]
      );
      return;
    }

    markPaidMutation.mutate({ eventId: evt.id, actualAmount: evt.expectedAmount, note: `Paid ${evt.name}` });
  };

  const handleReconcileSubmit = async () => {
    if (!reconcileAccountId || !reconcileActualAmount) return;
    setReconciling(true);
    try {
      await reconcileMutation.mutateAsync({
        accountId: reconcileAccountId,
        actualBalance: parseFloat(reconcileActualAmount).toFixed(2),
        targetCategoryId: reconcileTargetCategoryId || undefined,
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setReconciling(false);
    }
  };

  const incomeEventsList = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({
      id: e.id,
      type: 'INCOME' as const,
      name: e.sourceName || 'Paycheck Deposit',
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: 'Income Allocation',
      categoryId: null,
      note: 'Income Deposit',
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
      categoryId: e.categoryId,
      note: e.note || 'Bill/Expense',
    }));

  let combinedEvents = [...incomeEventsList, ...expenseEventsList];
  if (upcomingFilter === 'INCOME') combinedEvents = combinedEvents.filter((e) => e.type === 'INCOME');
  else if (upcomingFilter === 'EXPENSE') combinedEvents = combinedEvents.filter((e) => e.type === 'EXPENSE');

  if (upcomingSearch.trim()) {
    const q = upcomingSearch.toLowerCase();
    combinedEvents = combinedEvents.filter((e) => e.name.toLowerCase().includes(q) || e.categoryName.toLowerCase().includes(q));
  }

  combinedEvents.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const nextPaydayEvent = (incomeEventsQuery.data ?? []).find((e) => e.status === 'UPCOMING') ?? null;
  let daysUntilPayday: number | null = null;
  if (nextPaydayEvent) {
    const diffTime = new Date(nextPaydayEvent.expectedDate).getTime() - new Date(todayStr).getTime();
    daysUntilPayday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const D = DESIGN_TOKENS;

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100, gap: 16 }}>
        {/* Header Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        {/* ZONE 1: Payday Hero Banner & 4 Summary Stat Chips */}
        {nextPaydayEvent && (
          <View style={styles.paydayHeroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.paydayHeroTag}>NEXT PAYDAY READY</Text>
              <Text style={styles.paydayHeroTitle}>{nextPaydayEvent.sourceName || 'Paycheck Deposit'}</Text>
              <Text style={styles.paydayHeroSubtitle}>
                {formatAUD(nextPaydayEvent.expectedAmount)} • {daysUntilPayday === 0 ? 'Today!' : `in ${daysUntilPayday} days`}
              </Text>
            </View>

            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => handleQuickApprovePayday(nextPaydayEvent)}
                disabled={confirmPaydayMutation.isPending}
                style={styles.quickApproveBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.quickApproveBtnText}>⚡ 1-Tap Quick Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaydayWizardEventId(nextPaydayEvent.id)}
                style={styles.processPaydayBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.processPaydayBtnText}>Edit & Review Split →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.grid2x2}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>TOTAL INCOME</Text>
            <Text style={styles.chipValue}>{formatAUD(summaryQuery.data?.totalIncome || '0')}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>SPENT THIS MONTH</Text>
            <Text style={[styles.chipValue, { color: D.colors.critical }]}>{formatAUD(summaryQuery.data?.totalSpent || '0')}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>SAVED THIS MONTH</Text>
            <Text style={[styles.chipValue, { color: D.colors.accent }]}>{formatAUD(summaryQuery.data?.totalSaved || '0')}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>EVERYDAY BALANCE</Text>
            <Text style={styles.chipValue}>{formatAUD(summaryQuery.data?.everydayRemaining || '0')}</Text>
          </View>
        </View>

        {/* ZONE 2: Unified Upcoming Events & Payments List */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Upcoming Events & Payments</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setUpcomingFilter(tab)}
                  style={[styles.tabFilter, upcomingFilter === tab && styles.tabFilterActive]}
                >
                  <Text style={[styles.tabFilterText, upcomingFilter === tab && styles.tabFilterTextActive]}>
                    {tab === 'ALL' ? 'All' : tab === 'INCOME' ? 'Paydays' : 'Bills'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            value={upcomingSearch}
            onChangeText={setUpcomingSearch}
            placeholder="Search upcoming events..."
            placeholderTextColor={D.colors.textMuted}
            style={styles.searchInput}
          />

          {combinedEvents.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginVertical: 16 }}>
              No upcoming events found.
            </Text>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {combinedEvents.map((evt) => (
                <View key={`${evt.type}-${evt.id}`} style={styles.eventRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1B2B4B' }}>{evt.name}</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                      {new Date(evt.expectedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} • {evt.categoryName}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: evt.type === 'INCOME' ? '#10B981' : '#1B2B4B' }}>
                      {evt.type === 'INCOME' ? '+' : '-'}{formatAUD(evt.expectedAmount)}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 4 }}>
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
                        style={styles.editEventBtn}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#4B5563' }}>Edit</Text>
                      </TouchableOpacity>

                      {evt.type === 'INCOME' ? (
                        <TouchableOpacity onPress={() => setPaydayWizardEventId(evt.id)} style={styles.processBtn}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFF' }}>Review Split</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => handleMarkPaid(evt)} style={styles.markPaidBtn}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFF' }}>Mark Paid</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ZONE 3: Collapsible Tools Drawer */}
        <View style={styles.card}>
          <View style={styles.quickActionsHeader}>
            <Text style={styles.cardTitle}>🛠️ Tools & Financial Calculators</Text>
            <TouchableOpacity onPress={handleToggleQuickActions} style={styles.toggleBtn}>
              <Text style={styles.toggleBtnText}>{isQuickActionsOpen ? 'Collapse ▲' : 'Expand ▼'}</Text>
            </TouchableOpacity>
          </View>

          {isQuickActionsOpen && (
            <View style={{ gap: 12, marginTop: 12 }}>
              {/* Affordability Widget */}
              <View style={styles.widgetBox}>
                <Text style={styles.widgetTitle}>Can We Afford This?</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TextInput
                    value={canAffordAmount}
                    onChangeText={setCanAffordAmount}
                    placeholder="Enter amount ($)"
                    keyboardType="numeric"
                    placeholderTextColor={D.colors.textMuted}
                    style={styles.widgetInput}
                  />
                </View>
                {canAffordQuery.data && (
                  <Text
                    style={[
                      styles.affordResult,
                      {
                        color:
                          canAffordQuery.data.verdict === 'YES' || canAffordQuery.data.verdict === 'YES_WITH_IMPACT'
                            ? '#10B981'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {canAffordQuery.data.verdict === 'YES'
                      ? `✓ Yes! Remaining balance: ${formatAUD(canAffordQuery.data.everydayRemaining)}`
                      : canAffordQuery.data.verdict === 'YES_WITH_IMPACT'
                      ? `✓ Yes, using savings from ${canAffordQuery.data.affectedBucketName}`
                      : canAffordQuery.data.verdict === 'WAIT'
                      ? `⌛ Wait ${canAffordQuery.data.daysUntilNextPaycheck} days for next paycheck`
                      : `✕ Cannot afford: shortfall of ${formatAUD(canAffordQuery.data.shortfall)}`}
                  </Text>
                )}
              </View>

              {/* Action Buttons Rows */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setQuickModalType("DEBIT");
                    setQuickModalVisible(true);
                  }}
                  style={[styles.actionBtn, { backgroundColor: '#BE123C' }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>💸 Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setQuickModalType("CREDIT");
                    setQuickModalVisible(true);
                  }}
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>💰 Income</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMoveMoneyVisible(true)}
                  style={[styles.actionBtn, { backgroundColor: '#00B4A6' }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>🔄 Move Money</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/categories?health=AMBER')}
                  style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}
                >
                  <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 12 }}>Needs Attention ({atRiskCount})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(app)/categories?health=RED')}
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                >
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>Behind ({missedCount})</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Bank Balances & Reconciliation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bank Balances & Reconciliation</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {(bankAccountsQuery.data ?? []).map((acc: any) => {
              const actualNum = parseFloat(acc.lastKnownBalance || '0');
              const expectedNum = parseFloat(acc.expectedBalance || '0');
              const isDiff = Math.abs(actualNum - expectedNum) >= 0.01;

              return (
                <View key={acc.id} style={styles.accRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1B2B4B' }}>{acc.name}</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Expected: {formatAUD(expectedNum)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1B2B4B' }}>{formatAUD(actualNum)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setReconcileAccountId(acc.id);
                        setReconcileActualAmount(acc.lastKnownBalance || '0');
                        setReconcileModalVisible(true);
                      }}
                      style={[styles.reconcileBtn, isDiff && { backgroundColor: '#FEF3C7' }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: isDiff ? '#92400E' : '#4B5563' }}>
                        {isDiff ? 'Reconcile!' : 'Adjust'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Quick Record Modal */}
      <QuickExpenseModal
        visible={quickModalVisible}
        initialType={quickModalType}
        onClose={() => {
          setQuickModalVisible(false);
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      {/* Move Money Modal */}
      <MoveMoneyModal
        visible={moveMoneyVisible}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => {
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
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
          summaryQuery.refetch();
        }}
      />

      {/* Bank Reconcile Modal */}
      <Modal visible={reconcileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1B2B4B' }}>Reconcile Bank Balance</Text>
              <TouchableOpacity onPress={() => setReconcileModalVisible(false)}>
                <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>Actual Statement Balance ($)</Text>
            <TextInput
              value={reconcileActualAmount}
              onChangeText={setReconcileActualAmount}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>Target Category for Adjustment (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setReconcileTargetCategoryId('')}
                style={[styles.catChip, !reconcileTargetCategoryId && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, !reconcileTargetCategoryId && styles.catChipTextActive]}>-- Default --</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setReconcileTargetCategoryId(c.id)}
                  style={[styles.catChip, reconcileTargetCategoryId === c.id && styles.catChipActive]}
                >
                  <Text style={[styles.catChipText, reconcileTargetCategoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={handleReconcileSubmit} disabled={reconciling} style={styles.confirmBtn}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                {reconciling ? 'Reconciling...' : 'Confirm Reconciliation'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 12 },
  greeting: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1B2B4B' },
  paydayHeroCard: {
    backgroundColor: '#00B4A6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paydayHeroTag: { fontSize: 9, fontWeight: '900', color: '#E0F2FE', letterSpacing: 0.8 },
  paydayHeroTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', marginTop: 2 },
  paydayHeroSubtitle: { fontSize: 11, color: '#CCFBF1', marginTop: 2 },
  quickApproveBtn: { backgroundColor: '#1B2B4B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  quickApproveBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  processPaydayBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  processPaydayBtnText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  chipLabel: { fontSize: 9, fontWeight: 'bold', color: '#9CA3AF', letterSpacing: 0.5 },
  chipValue: { fontSize: 16, fontWeight: '900', color: '#1B2B4B', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  quickActionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1B2B4B' },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  toggleBtnText: { fontSize: 10, fontWeight: '700', color: '#4B5563' },
  widgetBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  widgetTitle: { fontSize: 12, fontWeight: '800', color: '#1B2B4B' },
  widgetInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 13, backgroundColor: '#FFF' },
  affordResult: { fontSize: 11, fontWeight: '800', marginTop: 6 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  reconcileBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  tabFilter: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  tabFilterActive: { backgroundColor: '#00B4A6' },
  tabFilterText: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
  tabFilterTextActive: { color: '#FFF' },
  searchInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  editEventBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  processBtn: { backgroundColor: '#00B4A6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  markPaidBtn: { backgroundColor: '#1B2B4B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12, color: '#1B2B4B' },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F3F4F6' },
  catChipActive: { backgroundColor: '#00B4A6' },
  catChipText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  catChipTextActive: { color: '#FFF' },
  confirmBtn: { backgroundColor: '#00B4A6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
