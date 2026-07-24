import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

export default function HomeScreen() {
  const router = useRouter();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;

  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [reconcileModalVisible, setReconcileModalVisible] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(null);
  const [reconcileActualAmount, setReconcileActualAmount] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const { data: session } = authClient.useSession();
  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
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
  if (upcomingFilter === 'INCOME') combinedEvents = combinedEvents.filter((e) => e.type === 'INCOME');
  else if (upcomingFilter === 'EXPENSE') combinedEvents = combinedEvents.filter((e) => e.type === 'EXPENSE');

  combinedEvents.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const handleMarkPaid = (evt: any) => {
    markPaidMutation.mutate({ eventId: evt.id });
  };

  const handleReconcileSubmit = async () => {
    if (!reconcileAccountId || !reconcileActualAmount) return;
    setReconciling(true);
    try {
      await reconcileMutation.mutateAsync({
        accountId: reconcileAccountId,
        actualBalance: parseFloat(reconcileActualAmount).toFixed(2),
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setReconciling(false);
    }
  };

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

        {/* 4 Summary Chips */}
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
                  <View>
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
                      style={[
                        styles.reconcileBtn,
                        isDiff && { backgroundColor: '#FEF3C7' },
                      ]}
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

        {/* At Risk & Missed Shortcuts */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/categories')}
            style={[styles.statusBox, { backgroundColor: '#FEF3C7' }]}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#92400E' }}>At Risk</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#92400E' }}>{atRiskCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(app)/categories')}
            style={[styles.statusBox, { backgroundColor: '#FEE2E2' }]}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#991B1B' }}>Missed</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#991B1B' }}>{missedCount}</Text>
          </TouchableOpacity>
        </View>

        {/* Unified Upcoming Events */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Upcoming Events</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setUpcomingFilter(tab)}
                  style={[
                    styles.tabFilter,
                    upcomingFilter === tab && styles.tabFilterActive,
                  ]}
                >
                  <Text style={[styles.tabFilterText, upcomingFilter === tab && styles.tabFilterTextActive]}>
                    {tab === 'ALL' ? 'All' : tab === 'INCOME' ? 'Income' : 'Bills'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {combinedEvents.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginVertical: 16 }}>
              No upcoming events found.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
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
                    {evt.type === 'EXPENSE' && (
                      <TouchableOpacity onPress={() => handleMarkPaid(evt)} style={styles.markPaidBtn}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFF' }}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reconcile Modal */}
      <Modal visible={reconcileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1B2B4B' }}>Reconcile Bank Balance</Text>
              <TouchableOpacity onPress={() => setReconcileModalVisible(false)}>
                <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 8 }}>Actual Bank Balance ($)</Text>
            <TextInput
              value={reconcileActualAmount}
              onChangeText={setReconcileActualAmount}
              keyboardType="numeric"
              style={styles.modalInput}
            />

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
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  chipLabel: { fontSize: 9, fontWeight: 'bold', color: '#9CA3AF', letterSpacing: 0.5 },
  chipValue: { fontSize: 16, fontWeight: '900', color: '#1B2B4B', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1B2B4B' },
  accRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  reconcileBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  statusBox: { flex: 1, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabFilter: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  tabFilterActive: { backgroundColor: '#00B4A6' },
  tabFilterText: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
  tabFilterTextActive: { color: '#FFF' },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  markPaidBtn: { backgroundColor: '#1B2B4B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16, color: '#1B2B4B' },
  confirmBtn: { backgroundColor: '#00B4A6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
