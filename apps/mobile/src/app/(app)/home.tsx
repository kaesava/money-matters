import React from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS, MobileAskSheet } from '@money-matters/ui/mobile';
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
      infoTooltip={{
        title: t('tooltips.dashboard.title'),
        content: t('tooltips.dashboard.content'),
      }}
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

      {/* Ask Money Matters AI Sheet */}
      <MobileAskSheet
        isOpen={askSheetVisible}
        onClose={() => setAskSheetVisible(false)}
        remainingCalls={
          usageQuery.data?.limit && usageQuery.data
            ? Math.max(0, usageQuery.data.limit - usageQuery.data.used)
            : undefined
        }
        onAsk={async (query: string) => {
          const res = await askMutation.mutateAsync({ query });
          usageQuery.refetch();
          return res;
        }}
        onNavigatePrefill={handleAssistantPrefill}
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
