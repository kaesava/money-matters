import React, { useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { DashboardHeroCard } from '../../components/DashboardHeroCard';
import { MobileNextPaydayCard } from '../../components/dashboard/MobileNextPaydayCard';
import { AttentionItemsList } from '../../components/AttentionItemsList';
import { GoalsProgressStrip } from '../../components/dashboard/GoalsProgressStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MobileMissingSchedulesBanner } from '../../components/dashboard/MobileMissingSchedulesBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType } from '../../components/QuickExpenseModal';
import { MobileAffordCheckModal } from '../../components/afford-check/MobileAffordCheckModal';
import {
  MobileReconciliationModal,
  MobileReconciliationModalProps,
} from '../../components/categories/MobileReconciliationModal';
import { useHomeData } from '../../components/dashboard/useHomeData';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();

  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [affordModalVisible, setAffordModalVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<MobileReconciliationModalProps['account'] | null>(null);

  const {
    refreshing,
    onRefresh,
    pools,
    bankAccounts,
    incomeCount,
    billsCount,
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

  const handleOpenEverydayReconciliation = () => {
    const matchedAccount = bankAccounts.find(
      (b) => b.id === everydayPool?.bankAccountId
    ) || bankAccounts[0];

    if (!matchedAccount) {
      return;
    }

    const linkedPools = pools
      .filter((p) => p.bankAccountId === matchedAccount.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        poolType: p.poolType,
        currentBalance: p.currentBalance || 0,
        isSurplusTarget: Boolean(p.isSurplusTarget),
      }));

    const expected = linkedPools.reduce(
      (sum, p) => sum + (parseFloat(String(p.currentBalance)) || 0),
      0
    );

    setReconcileAccount({
      id: matchedAccount.id,
      name: matchedAccount.name,
      lastKnownBalance: matchedAccount.lastKnownBalance || '0.00',
      unbudgetedBuffer: matchedAccount.unbudgetedBuffer || '0.00',
      expectedBalance: expected,
      linkedPools,
    });
  };

  const openQuickModal = (type: QuickActionType) => {
    setQuickModalType(type);
    setQuickModalVisible(true);
  };

  return (
    <AppScreenWrapper
      title={t('dashboard.title')}
      infoTooltip={{
        title: t('tooltips.dashboard.title'),
        content: t('tooltips.dashboard.content'),
      }}
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
        <MobileMissingSchedulesBanner
          incomeCount={incomeCount}
          billsCount={billsCount}
        />

        <DashboardHeroCard
          everydayBalance={everydayBalance}
          everydayMonthlyBudget={everydayMonthlyBudget}
          safetyBufferFloor={everydaySafetyBuffer}
          billsBalance={billsBalance}
          billsMonthlyBudget={billsMonthlyBudget}
          daysUntilPayday={daysUntilPayday}
          billsShortfall={billsShortfall}
          billsDue14DaysCount={billsDue14DaysCount}
          totalBillsDue14Days={totalBillsDue14Days}
          onMoveMoney={() => openQuickModal('TRANSFER')}
          onEverydayPress={() =>
            everydayPool
              ? router.push(`/(app)/pools/${everydayPool.id}` as never)
              : router.push('/(app)/categories')
          }
          onAlignEverydayBalance={handleOpenEverydayReconciliation}
          onBillsPress={() =>
            billsPool
              ? router.push(`/(app)/pools/${billsPool.id}` as never)
              : router.push('/(app)/categories')
          }
        />

        <MobileNextPaydayCard
          upcomingIncomes={upcomingIncomeList}
          onPressRunSplit={(id: string) => {
            if (posthog) posthog.capture('payday_wizard_opened');
            router.push(`/(app)/income-split/${id}` as never);
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
          onSkipExpense={(item) => deleteExpenseMutation.mutate({ eventId: item.id })}
          onExecuteTransfer={(item) =>
            executeTransferMutation.mutate({
              eventId: item.id,
              name: item.name,
              amount: item.expectedAmount.toFixed(2),
              sourcePoolId: item.sourcePoolId || undefined,
              destinationPoolId: item.destinationPoolId || undefined,
            })
          }
          onDeleteTransfer={(item) => deleteTransferMutation.mutate({ eventId: item.id })}
          onTopUpShortfall={() => openQuickModal('TRANSFER')}
        />

        <GoalsProgressStrip goals={goalsList} />
      </ScrollView>

      <QuickExpenseModal
        visible={quickModalVisible}
        initialType={quickModalType}
        onClose={() => {
          setQuickModalVisible(false);
          refetchAll();
        }}
      />

      <MarkPaidModal
        visible={!!markPaidEvent}
        event={markPaidEvent}
        onClose={() => setMarkPaidEvent(null)}
        onSuccess={refetchAll}
      />

      <MobileAffordCheckModal
        visible={affordModalVisible}
        onClose={() => setAffordModalVisible(false)}
      />

      {reconcileAccount && (
        <MobileReconciliationModal
          visible={Boolean(reconcileAccount)}
          account={reconcileAccount}
          onClose={() => setReconcileAccount(null)}
          onSuccess={refetchAll}
          onOpenTransfer={() => {
            setReconcileAccount(null);
            openQuickModal('TRANSFER');
          }}
        />
      )}
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
});
