import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper, MobileCollapsibleSection } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { UpcomingExpenseModal } from '../../components/UpcomingExpenseModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { AttentionItemsList, AttentionItem } from '../../components/AttentionItemsList';

export default function HomeScreen() {
  const router = useRouter();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);
  const [upcomingExpenseToEdit, setUpcomingExpenseToEdit] = useState<any | null>(null);
  const [upcomingIncomeToEdit, setUpcomingIncomeToEdit] = useState<any | null>(null);
  const [canAffordAmount, setCanAffordAmount] = useState('');

  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [upcomingSearch, setUpcomingSearch] = useState('');
  const [selectedEventKeys, setSelectedEventKeys] = useState<string[]>([]);

  const { data: session } = authClient.useSession();
  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const bulkDeleteEventsMutation = trpc.bulkDeleteEvents.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
      expenseEventsQuery.refetch();
      setSelectedEventKeys([]);
    },
  });

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const canAffordQuery = trpc.canAfford.useQuery(
    { amount: canAffordAmount },
    { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 }
  );

  const categories = categoriesQuery.data ?? [];
  const atRiskCount = categories.filter((c) => c.healthStatus === 'AMBER').length;
  const missedCount = categories.filter((c) => c.healthStatus === 'RED').length;
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || '0');

  const upcomingIncomeList = (incomeEventsQuery.data ?? []).filter((e) => e.status === 'UPCOMING');
  const nextPaydayEvent = upcomingIncomeList[0] ?? null;

  const nextPaydayData = nextPaydayEvent
    ? {
        id: nextPaydayEvent.id,
        name: nextPaydayEvent.sourceName || 'Paycheck Deposit',
        amount: parseFloat(nextPaydayEvent.expectedAmount),
        expectedDate: nextPaydayEvent.expectedDate,
      }
    : null;

  // Derive Attention Items (Overdue or Due within 3 days)
  const todayObj = new Date(todayStr);
  const threeDaysLater = new Date(todayObj);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const attentionItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .filter((e) => {
      const expDate = new Date(e.expectedDate);
      return expDate <= threeDaysLater;
    })
    .map((e) => {
      const cat = categories.find((c) => c.id === e.categoryId);
      const catBal = cat ? parseFloat(cat.currentBalance) : 0;
      const isOverdue = new Date(e.expectedDate) < todayObj;
      return {
        id: e.id,
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: e.categoryId,
        isOverdue,
        categoryBalance: catBal,
      };
    });

  const handleMarkPaidItem = (item: AttentionItem) => {
    markPaidMutation.mutate({ eventId: item.id, actualAmount: item.expectedAmount.toFixed(2), note: `Paid ${item.name}` });
  };

  const handleBulkDelete = () => {
    if (selectedEventKeys.length === 0) return;
    Alert.alert('Delete Events', `Delete ${selectedEventKeys.length} event(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const incomeIds = selectedEventKeys.filter((k) => k.startsWith('INCOME-')).map((k) => k.replace('INCOME-', ''));
          const expenseIds = selectedEventKeys.filter((k) => k.startsWith('EXPENSE-')).map((k) => k.replace('EXPENSE-', ''));
          bulkDeleteEventsMutation.mutate({ incomeEventIds: incomeIds, expenseEventIds: expenseIds });
        },
      },
    ]);
  };

  const incomeEventsMapped = upcomingIncomeList.map((e) => ({
    id: e.id,
    type: 'INCOME' as const,
    name: e.sourceName || 'Paycheck Deposit',
    expectedDate: e.expectedDate,
    expectedAmount: e.expectedAmount,
    categoryName: 'Income Allocation',
  }));

  const expenseEventsMapped = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({
      id: e.id,
      type: 'EXPENSE' as const,
      name: e.name,
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: e.categoryName || 'Uncategorized',
    }));

  let combinedEvents = [...incomeEventsMapped, ...expenseEventsMapped];
  if (upcomingFilter === 'INCOME') combinedEvents = combinedEvents.filter((e) => e.type === 'INCOME');
  else if (upcomingFilter === 'EXPENSE') combinedEvents = combinedEvents.filter((e) => e.type === 'EXPENSE');

  if (upcomingSearch.trim()) {
    const q = upcomingSearch.toLowerCase();
    combinedEvents = combinedEvents.filter((e) => e.name.toLowerCase().includes(q) || e.categoryName.toLowerCase().includes(q));
  }
  combinedEvents.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        {/* Hero Card */}
        <DashboardHeroCard
          everydayBalance={everydayBalance}
          atRiskCount={atRiskCount}
          missedCount={missedCount}
          nextPayday={nextPaydayData}
          onPressNextPay={(id) => setPaydayWizardEventId(id)}
        />

        {/* Attention Items */}
        <AttentionItemsList items={attentionItems} onMarkPaid={handleMarkPaidItem} />

        {/* Quick Actions Section */}
        <MobileCollapsibleSection title="Quick Actions" defaultOpen={false}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setQuickModalType('DEBIT'); setQuickModalVisible(true); }}
            >
              <Feather name="minus-circle" size={20} color={DESIGN_TOKENS.colors.critical} />
              <Text style={styles.actionCardText}>Record Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setQuickModalType('CREDIT'); setQuickModalVisible(true); }}
            >
              <Feather name="plus-circle" size={20} color={DESIGN_TOKENS.colors.semantic.success} />
              <Text style={styles.actionCardText}>Record Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setMoveMoneyVisible(true)}
            >
              <Feather name="repeat" size={20} color={DESIGN_TOKENS.colors.brand.primary} />
              <Text style={styles.actionCardText}>Move Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(app)/categories')}
            >
              <Feather name="grid" size={20} color={DESIGN_TOKENS.colors.neutral[700]} />
              <Text style={styles.actionCardText}>Categories</Text>
            </TouchableOpacity>
          </View>
        </MobileCollapsibleSection>

        {/* All Upcoming Section */}
        <MobileCollapsibleSection title={`All Upcoming (${combinedEvents.length})`} defaultOpen={true}>
          <View style={styles.upcomingHeader}>
            <TextInput
              value={upcomingSearch}
              onChangeText={setUpcomingSearch}
              placeholder="Search events..."
              style={styles.searchInput}
            />
            {selectedEventKeys.length > 0 ? (
              <TouchableOpacity style={styles.bulkDeleteBtn} onPress={handleBulkDelete}>
                <Text style={styles.bulkDeleteText}>Delete ({selectedEventKeys.length})</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {combinedEvents.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming events found.</Text>
          ) : (
            combinedEvents.slice(0, 10).map((evt) => (
              <View key={`${evt.type}-${evt.id}`} style={styles.eventRow}>
                <View>
                  <Text style={styles.eventName}>{evt.name}</Text>
                  <Text style={styles.eventSub}>{evt.categoryName} • {evt.expectedDate}</Text>
                </View>
                <Text style={[styles.eventAmount, evt.type === 'INCOME' && styles.incomeText]}>
                  {evt.type === 'INCOME' ? '+' : '-'}{formatAUD(evt.expectedAmount)}
                </Text>
              </View>
            ))
          )}
        </MobileCollapsibleSection>
      </ScrollView>

      {/* Modals */}
      <QuickExpenseModal
        visible={quickModalVisible}
        type={quickModalType}
        onClose={() => setQuickModalVisible(false)}
        onSuccess={() => { summaryQuery.refetch(); categoriesQuery.refetch(); }}
      />

      <MoveMoneyModal
        visible={moveMoneyVisible}
        onClose={() => setMoveMoneyVisible(false)}
        onSuccess={() => { summaryQuery.refetch(); categoriesQuery.refetch(); }}
      />

      {paydayWizardEventId ? (
        <PaydayPreviewWizard
          visible={!!paydayWizardEventId}
          incomeEventId={paydayWizardEventId}
          onClose={() => setPaydayWizardEventId(null)}
          onSuccess={() => {
            setPaydayWizardEventId(null);
            incomeEventsQuery.refetch();
            summaryQuery.refetch();
          }}
        />
      ) : null}
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  greeting: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 10,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  actionCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  bulkDeleteBtn: {
    backgroundColor: DESIGN_TOKENS.colors.critical,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bulkDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    marginVertical: 12,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.border,
  },
  eventName: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  eventSub: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  eventAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  incomeText: {
    color: DESIGN_TOKENS.colors.success,
  },
});
