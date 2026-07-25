import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { Feather } from '@expo/vector-icons';
import { formatAUD } from '../../lib/format';

import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { AttentionItemsList, AttentionItem } from '../../components/AttentionItemsList';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';
import { MobileCollapsibleSection } from '@money-matters/ui/mobile';

export default function HomeScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: session } = authClient.useSession();
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);

  const [upcomingSearch, setUpcomingSearch] = useState('');
  const [upcomingFilter, setUpcomingFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [selectedEventKeys, setSelectedEventKeys] = useState<string[]>([]);

  const [canAffordAmount, setCanAffordAmount] = useState('');

  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const canAffordQuery = trpc.canAfford.useQuery(
    { amount: canAffordAmount },
    { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 }
  );

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const categories = categoriesQuery.data ?? [];
  const needsAttentionCount = categories.filter((c) => c.healthStatus === 'AMBER').length;
  const behindCount = categories.filter((c) => c.healthStatus === 'RED').length;
  const onTrackCount = categories.filter((c) => c.healthStatus === 'GREEN').length;
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

  const todayObj = new Date(todayStr);
  const threeDaysLater = new Date(todayObj);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const attentionItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .filter((e) => new Date(e.expectedDate) <= threeDaysLater)
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
    setSelectedEventKeys([]);
  };

  const incomeEventsMapped = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === 'UPCOMING')
    .map((e) => ({
      id: e.id,
      type: 'INCOME' as const,
      name: e.sourceName || 'Income',
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: 'Everyday Pool',
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

        {/* Top Hero Card with Everyday Balance & Can We Afford This Widget */}
        <DashboardHeroCard
          everydayBalance={everydayBalance}
          needsAttentionCount={needsAttentionCount}
          behindCount={behindCount}
          onTrackCount={onTrackCount}
          canAffordAmount={canAffordAmount}
          setCanAffordAmount={setCanAffordAmount}
          canAffordData={canAffordQuery.data}
          nextPayday={nextPaydayData}
          onPressNextPay={(id) => setPaydayWizardEventId(id)}
          onSelectFilter={(health) => router.push({ pathname: '/(app)/categories', params: { health } })}
        />

        {/* Attention Items */}
        <AttentionItemsList items={attentionItems} onMarkPaid={handleMarkPaidItem} />

        {/* Permanent (Non-Collapsible) Quick Actions & Tools Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions & Tools</Text>
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
              <Feather name="plus-circle" size={20} color={DESIGN_TOKENS.colors.success} />
              <Text style={styles.actionCardText}>Record Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setMoveMoneyVisible(true)}
            >
              <Feather name="repeat" size={20} color={DESIGN_TOKENS.colors.primary} />
              <Text style={styles.actionCardText}>Move Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(app)/categories')}
            >
              <Feather name="grid" size={20} color={DESIGN_TOKENS.colors.textPrimary} />
              <Text style={styles.actionCardText}>Categories</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        initialType={quickModalType}
        onClose={() => setQuickModalVisible(false)}
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
          onSuccess={() => { setPaydayWizardEventId(null); incomeEventsQuery.refetch(); summaryQuery.refetch(); }}
        />
      ) : null}
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: DESIGN_TOKENS.spacing.containerMargin,
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
  sectionContainer: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 12,
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
