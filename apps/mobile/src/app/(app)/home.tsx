import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { trpc, setActiveSessionToken } from '../../lib/trpc';
import { authClient } from '../../lib/auth';
import * as SecureStore from 'expo-secure-store';
import { formatIsoDate } from '../../lib/format';

import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { MobileNextPaydayCard, MobileIncomeItem } from '../../components/dashboard/MobileNextPaydayCard';
import { AttentionItemsList, AttentionItem } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { BankBalancesStrip } from '../../components/dashboard/BankBalancesStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MobileMissingSchedulesBanner } from '../../components/dashboard/MobileMissingSchedulesBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType } from '../../components/QuickExpenseModal';

import { triggerHaptic } from '../../lib/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();
  const utils = trpc.useUtils();

  React.useEffect(() => {
    if (token) {
      SecureStore.setItemAsync('money-matters_session_token', token);
      SecureStore.setItemAsync('money-matters-session-token', token);
      setActiveSessionToken(token);
    }
  }, [token]);

  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = formatIsoDate(new Date());

  const { data: session } = authClient.useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const summaryQuery = trpc.getMonthlySummary.useQuery(
    {
      year: todayYear,
      month: todayMonth,
    },
    {
      enabled: !!session?.user,
    }
  );
  const poolsQuery = trpc.listPools.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const transferEventsQuery = trpc.listTransferEvents.useQuery(undefined, {
    enabled: !!session?.user,
  });

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

  const billsBalance = parseFloat(summaryQuery.data?.billsRemaining || '0');
  const billsMonthlyBudget = pools
    .filter((c) => c.poolType === 'REGULAR')
    .reduce((sum, c) => sum + parseFloat(c.targetAmount || '0'), 0);

  const upcomingIncomeList: MobileIncomeItem[] = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => {
      const matchedAccount = bankAccounts.find((b) => b.id === e.bankAccountId);
      const availableToBudget = matchedAccount
        ? parseFloat(String(matchedAccount.lastKnownBalance || '0')) -
          parseFloat(String(matchedAccount.unbudgetedBuffer || '0'))
        : null;

      return {
        id: e.id,
        name: e.sourceName || t('dashboard.title'),
        amount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        status: e.status,
        bankAccountId: e.bankAccountId ?? null,
        bankAccountName: matchedAccount?.name ?? null,
        availableToBudget,
      };
    });

  const nextPaycheck = upcomingIncomeList[0] ?? null;
  const daysUntilPayday = nextPaycheck
    ? Math.max(
        0,
        Math.ceil(
          (new Date(nextPaycheck.expectedDate + 'T00:00:00+10:00').getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 14;

  const todayObj = new Date(todayStr);

  const upcomingBillsList = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => ({
      id: e.id,
      name: e.name,
      amount: parseFloat(e.expectedAmount),
      dueDate: e.expectedDate,
    }));

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const billsDue14Days = upcomingBillsList.filter((b) => {
    const due = new Date(b.dueDate).getTime();
    return (
      due >= new Date().getTime() - 86400000 &&
      due <= new Date().getTime() + fourteenDaysMs
    );
  });

  const totalBillsDue14Days = billsDue14Days.reduce((sum, b) => sum + b.amount, 0);
  const billsShortfall = Math.max(0, totalBillsDue14Days - billsBalance);

  const expenseAttentionItems: AttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === 'PENDING')
    .map((e) => {
      const pool = pools.find((c) => c.id === (e.categoryId || e.poolId));
      const poolBal = pool
        ? typeof pool.currentBalance === 'number'
          ? pool.currentBalance
          : parseFloat(String(pool.currentBalance) || '0')
        : 0;
      const isOverdue = new Date(e.expectedDate) < todayObj;
      return {
        id: e.id,
        type: 'EXPENSE' as const,
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: e.categoryId || e.poolId,
        categoryName: pool?.name ?? t('poolTypes.bills'),
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
        name:
          e.name ||
          `Transfer: ${srcPool?.name ?? 'Source'} ➔ ${destPool?.name ?? 'Destination'}`,
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

  const attentionItems: AttentionItem[] = [
    ...expenseAttentionItems,
    ...transferAttentionItems,
  ].sort((a, b) => {
    const aOverdue = a.isOverdue || a.expectedDate < todayStr;
    const bOverdue = b.isOverdue || b.expectedDate < todayStr;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
  });

  const goalsList = pools.filter((p) => p.poolType === 'GOAL');
  const everydayPool = pools.find((p) => p.poolType === 'EVERYDAY');
  const billsPool = pools.find((p) => p.poolType === 'REGULAR');

  return (
    <AppScreenWrapper
      title={t('dashboard.title')}
      infoTooltip={{
        title: t('tooltips.dashboard.title'),
        content: t('tooltips.dashboard.content'),
      }}
      scrollable={false}
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
        {/* Missing Schedules Guidance Banner */}
        <MobileMissingSchedulesBanner
          incomeCount={incomeEventsQuery.data?.length ?? 0}
          billsCount={expenseEventsQuery.data?.length ?? 0}
        />

        {/* Bento Hero Card: Daily Spendable + Bills Coverage */}
        <DashboardHeroCard
          everydayBalance={everydayBalance}
          everydayMonthlyBudget={everydayMonthlyBudget}
          billsBalance={billsBalance}
          billsMonthlyBudget={billsMonthlyBudget}
          daysUntilPayday={daysUntilPayday}
          billsShortfall={billsShortfall}
          billsDue14DaysCount={billsDue14Days.length}
          totalBillsDue14Days={totalBillsDue14Days}
          needsAttentionCount={needsAttentionCount}
          behindCount={behindCount}
          onTrackCount={onTrackCount}
          onMoveMoney={() => {
            setQuickModalType('TRANSFER');
            setQuickModalVisible(true);
          }}
          onReconcile={() =>
            router.push('/(app)/settings/bank-accounts' as never)
          }
          onSelectFilter={() => router.push('/(app)/categories')}
          onEverydayPress={() =>
            everydayPool
              ? router.push(`/(app)/pools/${everydayPool.id}` as never)
              : router.push('/(app)/categories')
          }
          onBillsPress={() =>
            billsPool
              ? router.push(`/(app)/pools/${billsPool.id}` as never)
              : router.push('/(app)/categories')
          }
        />

        {/* Can We Afford This? Action Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/afford-check' as never)}
          style={styles.affordActionCard}
        >
          <View style={styles.affordIconWrap}>
            <Feather name="help-circle" size={20} color="#2563eb" />
          </View>
          <View style={styles.affordContent}>
            <Text style={styles.affordTitle}>{t('canIAfford.title')}</Text>
            <Text style={styles.affordSubtitle}>
              {t('dashboard.affordSubtitle')}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* Upcoming Income & Income Split Streams */}
        <MobileNextPaydayCard
          upcomingIncomes={upcomingIncomeList}
          onPressRunSplit={(id: string) => {
            if (posthog) posthog.capture('payday_wizard_opened');
            router.push(`/(app)/paychecks/${id}` as never);
          }}
          onDeleteIncome={(id: string) => {
            deleteIncomeMutation.mutate({ eventId: id });
          }}
        />

        {/* Attention Items: Upcoming Bills & Transfers */}
        <AttentionItemsList
          items={attentionItems}
          onMarkPaid={(item) =>
            setMarkPaidEvent({
              id: item.id,
              name: item.name,
              expectedAmount: item.expectedAmount,
              expectedDate: item.expectedDate,
              categoryId: item.categoryId,
            })
          }
          onSkipExpense={(item) =>
            deleteExpenseMutation.mutate({ eventId: item.id })
          }
          onExecuteTransfer={(item) =>
            executeTransferMutation.mutate({
              eventId: item.id,
              name: item.name,
              amount: item.expectedAmount.toFixed(2),
              sourcePoolId: item.sourcePoolId || undefined,
              destinationPoolId: item.destinationPoolId || undefined,
            })
          }
          onDeleteTransfer={(item) =>
            deleteTransferMutation.mutate({ eventId: item.id })
          }
          onTopUpShortfall={() => {
            setQuickModalType('TRANSFER');
            setQuickModalVisible(true);
          }}
        />

        {/* Goals Progress Strip */}
        <GoalsProgressStrip goals={goalsList} />

        {/* Bank Balances Summary Strip */}
        <BankBalancesStrip accounts={bankAccounts} />

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
                {t('dashboard.recordIncome')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                setQuickModalType('TRANSFER');
                setQuickModalVisible(true);
              }}
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
              <Text style={styles.actionCardText}>{t('nav.myMoney')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <QuickExpenseModal
        visible={quickModalVisible}
        initialType={quickModalType}
        onClose={() => {
          setQuickModalVisible(false);
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
  affordActionCard: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  affordIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordContent: {
    flex: 1,
  },
  affordTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  affordSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 8,
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
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
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
