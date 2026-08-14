import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { usePostHog } from 'posthog-react-native';


import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
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
  const posthog = usePostHog();
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

  // Guard: Redirect to setup wizard if tenant has 0 categories configured
  React.useEffect(() => {
    if (categoriesQuery.isSuccess && categoriesQuery.data && categoriesQuery.data.length === 0) {
      router.replace('/(setup)/income');
    }
  }, [categoriesQuery.isSuccess, categoriesQuery.data, router]);

  const needsAttentionCount = categories.filter((c) => c.healthStatus === 'AMBER').length;
  const behindCount = categories.filter((c) => c.healthStatus === 'RED').length;
  const onTrackCount = categories.filter((c) => c.healthStatus === 'GREEN').length;
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || '0');
  const everydayMonthlyBudget = categories
    .filter((c) => c.type === 'EVERYDAY')
    .reduce((sum, c) => sum + parseFloat(c.everydayAllowanceAmount || c.monthlyAmount || '0'), 0);

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
    posthog.capture('expense_paid', {
      amount: item.expectedAmount,
      is_overdue: item.isOverdue,
    });
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

  const dueGuardrailQuery = trpc.evaluateDueGuardrail.useQuery({ lookaheadDays: 14 });
  const dueGuardrail = dueGuardrailQuery.data;

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t("dashboard.welcome", { name: session?.user?.name ? session.user.name.split(" ")[0] : "Mate" })}</Text>
          <Text style={styles.headerTitle}>{t("dashboard.title")}</Text>
        </View>

        {/* Top Hero Card with Everyday Balance & Can We Afford This Widget */}
        <DashboardHeroCard
          everydayBalance={everydayBalance}
          everydayMonthlyBudget={everydayMonthlyBudget}
          needsAttentionCount={needsAttentionCount}
          behindCount={behindCount}
          onTrackCount={onTrackCount}
          canAffordAmount={canAffordAmount}
          setCanAffordAmount={setCanAffordAmount}
          canAffordData={canAffordQuery.data}
          nextPayday={nextPaydayData}
          onPressNextPay={(id) => {
            posthog.capture('payday_wizard_opened');
            setPaydayWizardEventId(id);
          }}
          onSelectFilter={(health) => router.push({ pathname: '/(app)/categories', params: { health } })}
        />

        {/* Orientation Pro Tip Card */}
        <View style={styles.tipCard}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.tipTitle}>{t("dashboard.bankAccountTip.title")}</Text>
            <Text style={styles.tipDesc}>{t("dashboard.bankAccountTip.description")}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings/bank-accounts' as Href)}
            style={styles.tipBtn}
          >
            <Text style={styles.tipBtnText}>{t("dashboard.bankAccountTip.action")}</Text>
          </TouchableOpacity>

        </View>

        {/* Due-Date Guardrail Shortfall Alert Card */}
        {dueGuardrail && dueGuardrail.status === 'SHORTFALL_ALERT' && (
          <View style={styles.guardrailCard}>
            <View style={styles.guardrailHeader}>
              <Text style={styles.guardrailIcon}>⚠️</Text>
              <View style={styles.guardrailTextContent}>
                <Text style={styles.guardrailTitle}>Bills Pool Payday Auto-Adjustment</Text>
                <Text style={styles.guardrailMsg}>
                  Upcoming bills (${dueGuardrail.requiredAmount.toFixed(2)}) due in 14 days exceed current Bills Pool balance (${dueGuardrail.currentBalance.toFixed(2)}). ${dueGuardrail.shortfallAmount.toFixed(2)} will be automatically added to your Bills top-up on next payday.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Attention Items */}
        <AttentionItemsList items={attentionItems} onMarkPaid={handleMarkPaidItem} />

        {/* Permanent (Non-Collapsible) Quick Actions & Tools Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t("dashboard.quickActions.title")}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setQuickModalType('DEBIT'); setQuickModalVisible(true); }}
            >
              <Feather name="minus-circle" size={20} color={DESIGN_TOKENS.colors.critical} />
              <Text style={styles.actionCardText}>{t("dashboard.quickActions.addExpense")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => { setQuickModalType('CREDIT'); setQuickModalVisible(true); }}
            >
              <Feather name="plus-circle" size={20} color={DESIGN_TOKENS.colors.success} />
              <Text style={styles.actionCardText}>{t("transactions.addIncome")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setMoveMoneyVisible(true)}
            >
              <Feather name="repeat" size={20} color={DESIGN_TOKENS.colors.primary} />
              <Text style={styles.actionCardText}>{t("dashboard.quickActions.moveMoney")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(app)/categories')}
            >
              <Feather name="grid" size={20} color={DESIGN_TOKENS.colors.textPrimary} />
              <Text style={styles.actionCardText}>{t("nav.myMoney")}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  guardrailCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  guardrailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guardrailIcon: {
    fontSize: 18,
  },
  guardrailTextContent: {
    flex: 1,
  },
  guardrailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 3,
  },
  guardrailMsg: { fontSize: 12, color: '#991B1B', marginTop: 2, lineHeight: 16 },
  tipCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#DBEAFE', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  tipDesc: { fontSize: 11, color: '#1E3A8A', marginTop: 2 },
  tipBtn: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tipBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
