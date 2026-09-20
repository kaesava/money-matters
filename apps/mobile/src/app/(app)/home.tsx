import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD, formatIsoDate } from '../../lib/format';

import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { AttentionItemsList, AttentionItem } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { BankBalancesStrip } from '../../components/dashboard/BankBalancesStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType } from '../../components/QuickExpenseModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { showMobileConfirm } from '@money-matters/ui/mobile';

import { triggerHaptic } from '../../lib/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = formatIsoDate(new Date());

  const { data: session } = authClient.useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const summaryQuery = trpc.getMonthlySummary.useQuery({
    year: todayYear,
    month: todayMonth,
  });
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();
  const billCoverageQuery = trpc.listBillCoverage.useQuery();

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const executeTransferMutation = trpc.executeTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
      poolsQuery.refetch();
      utils.listTransactions.invalidate();
    },
  });

  const deleteTransferMutation = trpc.deleteTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
    },
  });

  const deleteExpenseMutation = trpc.deleteExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      poolsQuery.refetch();
    },
  });

  const deleteIncomeMutation = trpc.deleteIncomeEvent.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
    },
  });


  const onRefresh = async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await Promise.all([
      summaryQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      incomeEventsQuery.refetch(),
      expenseEventsQuery.refetch(),
      transferEventsQuery.refetch(),
      billCoverageQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const needsAttentionCount = pools.filter((c) => c.healthStatus === 'AMBER').length;
  const behindCount = pools.filter((c) => c.healthStatus === 'RED').length;
  const onTrackCount = pools.filter((c) => c.healthStatus === 'GREEN').length;
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || '0');
  const everydayMonthlyBudget = pools
    .filter((c) => c.poolType === 'EVERYDAY')
    .reduce(
      (sum, c) =>
        sum + parseFloat(c.everydayAllowanceAmount || c.targetAmount || '0'),
      0
    );

  const upcomingIncomeList = (incomeEventsQuery.data ?? []).filter(
    (e) => e.status === 'PENDING'
  );
  const nextPaydayEvent = upcomingIncomeList[0] ?? null;

  const nextPaydayData = nextPaydayEvent
    ? {
        id: nextPaydayEvent.id,
        name: nextPaydayEvent.sourceName || t('home.paycheckDepositFallback'),
        amount: parseFloat(nextPaydayEvent.expectedAmount),
        expectedDate: nextPaydayEvent.expectedDate,
      }
    : null;

  const todayObj = new Date(todayStr);
  const threeDaysLater = new Date(todayObj);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const expenseAttentionItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .filter((e) => new Date(e.expectedDate) <= threeDaysLater)
    .map((e) => {
      const pool = pools.find((c) => c.id === (e.categoryId || e.poolId));
      const poolBal = pool
        ? typeof pool.currentBalance === 'number'
          ? pool.currentBalance
          : parseFloat(pool.currentBalance || '0')
        : 0;
      const isOverdue = new Date(e.expectedDate) < todayObj;
      return {
        id: e.id,
        type: 'EXPENSE' as const,
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: e.categoryId || e.poolId,
        isOverdue,
        categoryBalance: poolBal,
      };
    });

  const transferAttentionItems: AttentionItem[] = (transferEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => {
      const srcPool = pools.find((p) => p.id === e.sourcePoolId);
      const destPool = pools.find((p) => p.id === e.destinationPoolId);
      const isOverdue = new Date(e.expectedDate) < todayObj;
      return {
        id: e.id,
        type: 'TRANSFER' as const,
        name: e.name || `Transfer: ${srcPool?.name ?? 'Source'} ➔ ${destPool?.name ?? 'Destination'}`,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        sourcePoolId: e.sourcePoolId,
        sourcePoolName: srcPool?.name ?? e.sourcePoolName ?? 'Source',
        destinationPoolId: e.destinationPoolId,
        destinationPoolName: destPool?.name ?? e.destinationPoolName ?? 'Destination',
        isOverdue,
        categoryBalance: 0,
      };
    });

  const attentionItems: AttentionItem[] = [...expenseAttentionItems, ...transferAttentionItems].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
  });

  const hasMissingSchedules = pools.some(
    (p) =>
      p.poolType !== 'EVERYDAY' &&
      (!p.targetAmount || parseFloat(p.targetAmount) <= 0)
  );

  const billCoverage = billCoverageQuery.data;
  const billsPoolBalance = billCoverage?.billsPoolBalance ?? 0;
  const upcomingBillsTotal = billCoverage?.totalUpcomingBeforePayday ?? 0;
  const billsShortfall = Math.max(0, upcomingBillsTotal - billsPoolBalance);

  const goalsList = pools.filter((p) => p.poolType === 'GOAL');
  const everydayPool = pools.find((p) => p.poolType === 'EVERYDAY');
  const billsPool = pools.find((p) => p.poolType === 'REGULAR');

  const handleSkipExpense = (item: AttentionItem) => {
    showMobileConfirm({
      title: t('home.skipExpenseTitle'),
      message: t('home.skipExpenseMessage').replace('{name}', item.name),
      confirmText: t('home.skipExpenseConfirm'),
      onConfirm: () => deleteExpenseMutation.mutate({ eventId: item.id }),
    });
  };

  const handleDeleteTransfer = (item: AttentionItem) => {
    showMobileConfirm({
      title: t('home.deleteTransferTitle'),
      message: t('home.deleteTransferMessage'),
      confirmText: t('home.deleteTransferConfirm'),
      onConfirm: () => deleteTransferMutation.mutate({ eventId: item.id }),
    });
  };

  const handleExecuteTransfer = (item: AttentionItem) => {
    executeTransferMutation.mutate({
      eventId: item.id,
      name: item.name,
      amount: item.expectedAmount.toFixed(2),
      sourcePoolId: item.sourcePoolId || undefined,
      destinationPoolId: item.destinationPoolId || undefined,
    });
  };

  return (
    <AppScreenWrapper
      title={t('nav.dashboard')}
      infoTooltip={{
        title: t('tooltips.dashboard.title'),
        content: t('tooltips.dashboard.content'),
      }}
    >
      {/* Customer Trial & Lifecycle Banner */}
      <TrialBanner />

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
        {/* Top Hero Card with Everyday Balance Ring & Next Payday */}
        <DashboardHeroCard
          everydayBalance={everydayBalance}
          everydayMonthlyBudget={everydayMonthlyBudget}
          needsAttentionCount={needsAttentionCount}
          behindCount={behindCount}
          onTrackCount={onTrackCount}
          canAffordAmount=""
          setCanAffordAmount={() => {}}
          canAffordData={null}
          nextPayday={nextPaydayData}
          onPressNextPay={(id) => {
            if (posthog) posthog.capture('payday_wizard_opened');
            router.push(`/(app)/paychecks/${id}` as never);
          }}
          onSelectFilter={() => router.push('/(app)/categories')}
        />

        {/* Can We Afford This? Action Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/afford-check' as never)}
          style={styles.affordActionCard}
        >
          <View style={styles.affordIconWrap}>
            <Feather name="help-circle" size={22} color="#2563eb" />
          </View>
          <View style={styles.affordContent}>
            <Text style={styles.affordTitle}>
              {t('canIAfford.title')}
            </Text>
            <Text style={styles.affordSubtitle}>
              {t('dashboard.affordSubtitle')}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* Bento Pools Summary Strip */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionHeading}>
            {t('dashboard.bentoPoolsHealth')}
          </Text>
          <View style={styles.bentoGrid}>
            {/* Everyday Pool Card */}
            <TouchableOpacity
              onPress={() =>
                everydayPool
                  ? router.push(`/(app)/pools/${everydayPool.id}` as never)
                  : router.push('/(app)/categories')
              }
              style={styles.bentoCard}
            >
              <View style={styles.bentoTop}>
                <Text style={styles.bentoTag}>{t('poolTypes.everyday')}</Text>
              </View>
              <Text style={styles.bentoBalance}>{formatAUD(everydayBalance)}</Text>
              <Text style={styles.bentoSub}>
                {t('dashboard.remainingAllowance')}
              </Text>
            </TouchableOpacity>

            {/* Regular Bills Pool Card */}
            <TouchableOpacity
              onPress={() =>
                billsPool
                  ? router.push(`/(app)/pools/${billsPool.id}` as never)
                  : router.push('/(app)/categories')
              }
              style={styles.bentoCard}
            >
              <View style={styles.bentoTop}>
                <Text style={styles.bentoTag}>{t('poolTypes.bills')}</Text>
              </View>
              <Text style={styles.bentoBalance}>{formatAUD(billsPoolBalance)}</Text>
              <View style={styles.billsStatusRow}>
                {billsShortfall > 0 ? (
                  <Text style={styles.billsShortText}>
                    {t('dashboard.billsShortAmount').replace('{amount}', formatAUD(billsShortfall))}
                  </Text>
                ) : (
                  <Text style={styles.billsCoveredText}>
                    {t('dashboard.bills14DaysCovered')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goals Progress Strip */}
        <GoalsProgressStrip goals={goalsList} />

        {/* Bank Balances Summary Strip */}
        <BankBalancesStrip accounts={bankAccounts} />

        {/* Attention Items & Nudges */}
        <AttentionItemsList
          items={attentionItems}
          hasMissingSchedules={hasMissingSchedules}
          onMarkPaid={(item) =>
            setMarkPaidEvent({
              id: item.id,
              name: item.name,
              expectedAmount: item.expectedAmount,
              expectedDate: item.expectedDate,
              categoryId: item.categoryId,
            })
          }
          onSkipExpense={handleSkipExpense}
          onExecuteTransfer={handleExecuteTransfer}
          onDeleteTransfer={handleDeleteTransfer}
          onTopUpShortfall={() => setMoveMoneyVisible(true)}
        />

        {/* Quick Actions Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>
            {t('dashboard.quickActions.title')}
          </Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                setQuickModalType('DEBIT');
                setQuickModalVisible(true);
              }}
            >
              <Feather name="minus-circle" size={20} color="#ba1a1a" />
              <Text style={styles.actionCardText}>
                {t('dashboard.quickActions.addExpense')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                setQuickModalType('CREDIT');
                setQuickModalVisible(true);
              }}
            >
              <Feather name="plus-circle" size={20} color="#22c55e" />
              <Text style={styles.actionCardText}>
                {t('transactions.addIncome')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setMoveMoneyVisible(true)}
            >
              <Feather name="repeat" size={20} color="#2563eb" />
              <Text style={styles.actionCardText}>
                {t('dashboard.quickActions.moveMoney')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(app)/categories')}
            >
              <Feather name="grid" size={20} color="#1B2B4B" />
              <Text style={styles.actionCardText}>
                {t('nav.myMoney')}
              </Text>
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
        onSuccess={() => {
          summaryQuery.refetch();
          poolsQuery.refetch();
        }}
      />

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          poolsQuery.refetch();
          summaryQuery.refetch();
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  affordActionCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  affordIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordContent: {
    flex: 1,
  },
  affordTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  affordSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  bentoSection: {
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 10,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  bentoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bentoIcon: {
    fontSize: 16,
  },
  bentoTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  bentoBalance: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    marginBottom: 2,
  },
  bentoSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  billsStatusRow: {
    marginTop: 2,
  },
  billsShortText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  billsCoveredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B2B4B',
  },
});
