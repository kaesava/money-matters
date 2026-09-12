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
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import { formatAUD } from '../../lib/format';

import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { AttentionItemsList, AttentionItem } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { BankBalancesStrip } from '../../components/dashboard/BankBalancesStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType } from '../../components/QuickExpenseModal';
import { MoveMoneyModal } from '../../components/MoveMoneyModal';
import { PaydayPreviewWizard } from '../../components/PaydayPreviewWizard';

export default function HomeScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
  }).format(new Date());

  const { data: session } = authClient.useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [moveMoneyVisible, setMoveMoneyVisible] = useState(false);
  const [paydayWizardEventId, setPaydayWizardEventId] = useState<string | null>(null);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const summaryQuery = trpc.getMonthlySummary.useQuery({
    year: todayYear,
    month: todayMonth,
  });
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const billCoverageQuery = trpc.listBillCoverage.useQuery();

  const pools = poolsQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  // Redirect to setup if no pools exist
  React.useEffect(() => {
    if (poolsQuery.isSuccess && poolsQuery.data && poolsQuery.data.length === 0) {
      router.replace('/(setup)/income');
    }
  }, [poolsQuery.isSuccess, poolsQuery.data, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      summaryQuery.refetch(),
      poolsQuery.refetch(),
      bankAccountsQuery.refetch(),
      incomeEventsQuery.refetch(),
      expenseEventsQuery.refetch(),
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
        name: nextPaydayEvent.sourceName || 'Paycheck Deposit',
        amount: parseFloat(nextPaydayEvent.expectedAmount),
        expectedDate: nextPaydayEvent.expectedDate,
      }
    : null;

  const todayObj = new Date(todayStr);
  const threeDaysLater = new Date(todayObj);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const attentionItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
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
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: e.categoryId || e.poolId,
        isOverdue,
        categoryBalance: poolBal,
      };
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

  return (
    <MobileScreenWrapper
      user={session?.user}
      onNavigateHome={() => router.push('/(app)/home')}
      onNavigateCategories={() => router.push('/(app)/categories')}
      onNavigateSettings={() => router.push('/(app)/settings')}
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
        {/* Greeting Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {t('dashboard.welcome', {
              name: session?.user?.name
                ? session.user.name.split(' ')[0]
                : 'Mate',
            })}
          </Text>
          <Text style={styles.headerTitle}>{t('dashboard.title') || 'Dashboard'}</Text>
        </View>

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
              {t('canIAfford.title') || 'Can We Afford This?'}
            </Text>
            <Text style={styles.affordSubtitle}>
              Simulate a purchase against your safe-to-spend allowance
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* Bento Pools Summary Strip */}
        <View style={styles.bentoSection}>
          <Text style={styles.sectionHeading}>Pools Health</Text>
          <View style={styles.bentoGrid}>
            {/* Everyday Pool Card */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/categories')}
              style={styles.bentoCard}
            >
              <View style={styles.bentoTop}>
                <Text style={styles.bentoIcon}>☕</Text>
                <Text style={styles.bentoTag}>Everyday</Text>
              </View>
              <Text style={styles.bentoBalance}>{formatAUD(everydayBalance)}</Text>
              <Text style={styles.bentoSub}>Remaining allowance</Text>
            </TouchableOpacity>

            {/* Regular Bills Pool Card */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/categories')}
              style={styles.bentoCard}
            >
              <View style={styles.bentoTop}>
                <Text style={styles.bentoIcon}>📅</Text>
                <Text style={styles.bentoTag}>Bills</Text>
              </View>
              <Text style={styles.bentoBalance}>{formatAUD(billsPoolBalance)}</Text>
              <View style={styles.billsStatusRow}>
                {billsShortfall > 0 ? (
                  <Text style={styles.billsShortText}>
                    ⚠️ Short {formatAUD(billsShortfall)}
                  </Text>
                ) : (
                  <Text style={styles.billsCoveredText}>
                    ✅ 14 days covered
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
        />

        {/* Quick Actions Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>
            {t('dashboard.quickActions.title') || 'Quick Actions'}
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
                {t('dashboard.quickActions.addExpense') || 'Expense'}
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
                {t('transactions.addIncome') || 'Income'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setMoveMoneyVisible(true)}
            >
              <Feather name="repeat" size={20} color="#2563eb" />
              <Text style={styles.actionCardText}>
                {t('dashboard.quickActions.moveMoney') || 'Transfer'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(app)/categories')}
            >
              <Feather name="grid" size={20} color="#1B2B4B" />
              <Text style={styles.actionCardText}>
                {t('nav.myMoney') || 'Pools'}
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
    </MobileScreenWrapper>
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
