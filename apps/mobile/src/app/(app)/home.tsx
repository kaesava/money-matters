import React from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS, MobileCommandPaletteSheet } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { MobileNextPaydayCard } from '../../components/dashboard/MobileNextPaydayCard';
import { AttentionItemsList } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MarkPaidModal } from '../../components/MarkPaidModal';
import { QuickExpenseModal } from '../../components/QuickExpenseModal';
import { MobileAffordCheckModal } from '../../components/afford-check/MobileAffordCheckModal';
import { MobileAffordCheckCard } from '../../components/dashboard/MobileAffordCheckCard';
import { ReconcileNudgeCard } from '../../components/dashboard/attention/ReconcileNudgeCard';
import { MobileReconciliationModal } from '../../components/envelopes/MobileReconciliationModal';
import { useHomeData } from '../../components/dashboard/useHomeData';
import { useHomeModals } from '../../components/dashboard/useHomeModals';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();

  const askMutation = trpc.assistantAsk.useMutation();
  const usageQuery = trpc.assistantUsage.useQuery(undefined, {
    staleTime: 30_000,
  });

  const {
    refreshing,
    onRefresh,
    pools,
    bankAccounts,
    incomeCount,
    billsCount,
    homeSummary,
    safeToSpend,
    dailyPace,
    paceStatus,
    everydayBalance,
    everydayMonthlyBudget,
    everydaySafetyBuffer,
    billsBalance,
    billsMonthlyBudget,
    daysUntilPayday,
    billsShortfall,
    billsDue14DaysCount,
    totalBillsDue14Days,
    upcomingIncomeList,
    incomeEvents,
    expenseEvents,
    attentionItems,
    goalsList,
    everydayPool,
    billsPool,
    executeTransferMutation,
    deleteTransferMutation,
    deleteExpenseMutation,
    deleteIncomeMutation,
    refetchAll,
  } = useHomeData(token);

  const utils = trpc.useUtils();

  const searchAccounts = React.useMemo(() => {
    return bankAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.accountType,
      currentBalance: parseFloat(acc.lastKnownBalance || '0'),
    }));
  }, [bankAccounts]);

  const searchEnvelopes = React.useMemo(() => {
    return pools.map((env) => ({
      id: env.id,
      name: env.name,
      type: env.envelopeType,
      currentBalance: env.currentBalance,
    }));
  }, [pools]);

  const searchEvents = React.useMemo(() => {
    const incomes = incomeEvents.map((ev) => ({
      id: ev.id,
      name: ev.name,
      amount: parseFloat(ev.expectedAmount),
      dueDate: ev.expectedDate,
      type: 'INCOME' as const,
    }));
    const expenses = expenseEvents.map((ev) => ({
      id: ev.id,
      name: ev.name,
      amount: parseFloat(ev.expectedAmount),
      dueDate: ev.expectedDate,
      type: 'EXPENSE' as const,
    }));
    return [...incomes, ...expenses];
  }, [incomeEvents, expenseEvents]);

  const handleSearchTransactions = React.useCallback(
    async (q: string) => {
      const res = await utils.searchTransactions.fetch({ query: q, limit: 10 });
      return res.map((tx) => ({
        id: tx.id,
        recordedAt: tx.recordedAt,
        amount: parseFloat(tx.amount),
        note: tx.note,
        flowType: tx.flowType,
        envelopeName: tx.envelopeName,
        envelopeId: tx.envelopeId,
        bankAccountId: tx.bankAccountId,
      }));
    },
    [utils]
  );

  const {
    quickModalVisible,
    setQuickModalVisible,
    quickModalType,
    quickModalData,
    affordModalVisible,
    setAffordModalVisible,
    affordModalAmount,
    askSheetVisible,
    setAskSheetVisible,
    markPaidEvent,
    setMarkPaidEvent,
    reconcileAccount,
    setReconcileAccount,
    openQuickModal,
    handleOpenEverydayReconciliation,
    handleAssistantPrefill,
  } = useHomeModals(pools, bankAccounts, everydayPool);

  const isBalanceMatchOverdue = React.useMemo(() => {
    if (bankAccounts.length === 0) return false;
    if (homeSummary?.oldestBalanceMatchAt) {
      const lastMatch = new Date(homeSummary.oldestBalanceMatchAt).getTime();
      return (Date.now() - lastMatch) > 14 * 24 * 60 * 60 * 1000;
    }
    if (homeSummary?.tenantCreatedAt) {
      const accountAge = Date.now() - new Date(homeSummary.tenantCreatedAt).getTime();
      return accountAge > 14 * 24 * 60 * 60 * 1000;
    }
    return false;
  }, [bankAccounts.length, homeSummary?.oldestBalanceMatchAt, homeSummary?.tenantCreatedAt]);

  return (
    <AppScreenWrapper
      title={t('dashboard.title')}
      onOpenAsk={() => setAskSheetVisible(true)}
      scrollable={false}
    >
      <TrialBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN_TOKENS.colors.sereneBlue}
          />
        }
      >

        <DashboardHeroCard
          everydayBalance={everydayBalance}
          everydayMonthlyBudget={everydayMonthlyBudget}
          safetyBufferFloor={everydaySafetyBuffer}
          billsBalance={billsBalance}
          billsMonthlyBudget={billsMonthlyBudget}
          daysUntilPayday={daysUntilPayday}
          safeToSpend={safeToSpend}
          dailyPace={dailyPace}
          paceStatus={paceStatus}
          isAwaitingFirstPayday={homeSummary?.isAwaitingFirstPayday}
          billsShortfall={billsShortfall}
          billsDue14DaysCount={billsDue14DaysCount}
          totalBillsDue14Days={totalBillsDue14Days}
          onMoveMoney={() => openQuickModal('TRANSFER')}
          onEverydayPress={() =>
            everydayPool
              ? router.push(`/(app)/envelopes/${everydayPool.id}` as Href)
              : router.push('/(app)/envelopes' as Href)
          }
          onAlignEverydayBalance={handleOpenEverydayReconciliation}
          onBillsPress={() =>
            billsPool
              ? router.push(`/(app)/envelopes/${billsPool.id}` as Href)
              : router.push('/(app)/envelopes' as Href)
          }
        />

        <MobileNextPaydayCard
          upcomingIncomes={upcomingIncomeList}
          onPressRunSplit={(id: string) => {
            if (posthog) posthog.capture('payday_wizard_opened');
            router.push(`/(app)/income-split/${id}` as Href);
          }}
          onDeleteIncome={(id: string) => {
            deleteIncomeMutation.mutate({ eventId: id });
          }}
        />

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
            executeTransferMutation.mutate({ eventId: item.id })
          }
          onDeleteTransfer={(item) =>
            deleteTransferMutation.mutate({ eventId: item.id })
          }
        />

        {goalsList.length > 0 && (
          <GoalsProgressStrip goals={goalsList} />
        )}
      </ScrollView>

      {/* Quick Action Drawer */}
      <QuickExpenseModal
        visible={quickModalVisible}
        initialType={quickModalType}
        initialData={quickModalData}
        onClose={() => setQuickModalVisible(false)}
        onSuccess={() => refetchAll()}
      />

      {/* Affordability Check Modal */}
      <MobileAffordCheckModal
        visible={affordModalVisible}
        onClose={() => setAffordModalVisible(false)}
        initialAmount={affordModalAmount}
      />

      {/* Reconciliation Modal */}
      {reconcileAccount && (
        <MobileReconciliationModal
          visible={true}
          account={reconcileAccount}
          onClose={() => setReconcileAccount(null)}
          onSuccess={() => {
            setReconcileAccount(null);
            refetchAll();
          }}
        />
      )}

      {/* Mark Paid Modal */}
      <MarkPaidModal
        visible={Boolean(markPaidEvent)}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={() => {
          setMarkPaidEvent(null);
          refetchAll();
        }}
      />

      {/* Global Command Palette & Search Sheet */}
      <MobileCommandPaletteSheet
        isOpen={askSheetVisible}
        onClose={() => setAskSheetVisible(false)}
        accounts={searchAccounts}
        envelopes={searchEnvelopes}
        upcomingEvents={searchEvents}
        onSearchTransactions={handleSearchTransactions}
        remainingCalls={
          usageQuery.data?.limit && usageQuery.data
            ? Math.max(0, usageQuery.data.limit - usageQuery.data.used)
            : undefined
        }
        onAskPenny={async (query: string) => {
          const res = await askMutation.mutateAsync({ query });
          usageQuery.refetch();
          return res;
        }}
        onNavigatePrefill={handleAssistantPrefill}
        onSelectAccount={() => {
          router.push('/(app)/settings/bank-accounts' as Href);
        }}
        onSelectEnvelope={(env) => {
          router.push(`/(app)/envelopes/${env.id}` as Href);
        }}
        onSelectEvent={() => {
          router.push('/(app)/income-and-bills' as Href);
        }}
        onSelectTransaction={() => {
          router.push('/(app)/transactions' as Href);
        }}
        onViewAllTransactions={(q) => {
          router.push(`/(app)/transactions?search=${encodeURIComponent(q)}` as Href);
        }}
      />
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
});
