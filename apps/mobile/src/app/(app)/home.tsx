import React from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
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
import { SyncBalanceNudgeCard } from '../../components/dashboard/attention/SyncBalanceNudgeCard';
import { MobileSyncBalanceModal } from '../../components/envelopes/MobileSyncBalanceModal';
import { useHomeData } from '../../components/dashboard/useHomeData';
import { useHomeModals } from '../../components/dashboard/useHomeModals';
import { useMobileProductTour } from '../../context/ProductTourContext';
import { useAppFeatures } from '../../context/useAppFeatures';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();
  const { hasSimulation } = useAppFeatures();
  const { registerTourTarget } = useMobileProductTour();
  const heroRef = React.useRef<View>(null);
  const paydayRef = React.useRef<View>(null);

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

  const {
    quickModalVisible,
    setQuickModalVisible,
    quickModalType,
    quickModalData,
    affordModalVisible,
    setAffordModalVisible,
    affordModalAmount,
    markPaidEvent,
    setMarkPaidEvent,
    reconcileAccount,
    setReconcileAccount,
    openQuickModal,
    handleOpenEverydayReconciliation,
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

        <View
          ref={heroRef}
          onLayout={() => {
            heroRef.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) registerTourTarget('envelopes-row', { x, y, width, height });
            });
          }}
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
        </View>

        <View
          ref={paydayRef}
          onLayout={() => {
            paydayRef.current?.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) registerTourTarget('payday-card', { x, y, width, height });
            });
          }}
        >
          <MobileNextPaydayCard
            upcomingIncomes={upcomingIncomeList}
            onPressRunSplit={(id: string) => {
              if (posthog) posthog.capture('payday_wizard_opened');
              router.push(`/(app)/payday-plan/${id}` as Href);
            }}
            onDeleteIncome={(id: string) => {
              deleteIncomeMutation.mutate({ eventId: id });
            }}
          />
        </View>

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
      {hasSimulation && (
        <MobileAffordCheckModal
          visible={affordModalVisible}
          onClose={() => setAffordModalVisible(false)}
          initialAmount={affordModalAmount}
        />
      )}

      {/* Reconciliation Modal */}
      {reconcileAccount && (
        <MobileSyncBalanceModal
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
