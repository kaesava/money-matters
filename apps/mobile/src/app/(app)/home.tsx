import React, { useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { MobileMissingSchedulesBanner } from '../../components/dashboard/MobileMissingSchedulesBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType, QuickActionInitialData } from '../../components/QuickExpenseModal';
import { MobileAffordCheckModal } from '../../components/afford-check/MobileAffordCheckModal';
import {
  MobileReconciliationModal,
  MobileReconciliationModalProps,
} from '../../components/envelopes/MobileReconciliationModal';
import { useHomeData } from '../../components/dashboard/useHomeData';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();

  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [quickModalData, setQuickModalData] = useState<QuickActionInitialData | undefined>(undefined);
  const [affordModalVisible, setAffordModalVisible] = useState(false);
  const [affordModalAmount, setAffordModalAmount] = useState<string | undefined>(undefined);
  const [askSheetVisible, setAskSheetVisible] = useState(false);
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<MobileReconciliationModalProps['account'] | null>(null);

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
        envelopeType: p.envelopeType,
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
              ? router.push(`/(app)/envelopes/${everydayPool.id}` as never)
              : router.push('/(app)/envelopes')
          }
          onAlignEverydayBalance={handleOpenEverydayReconciliation}
          onBillsPress={() =>
            billsPool
              ? router.push(`/(app)/envelopes/${billsPool.id}` as never)
              : router.push('/(app)/envelopes')
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
        initialData={quickModalData}
        onClose={() => {
          setQuickModalVisible(false);
          setQuickModalData(undefined);
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
        initialAmount={affordModalAmount}
        onClose={() => {
          setAffordModalVisible(false);
          setAffordModalAmount(undefined);
        }}
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

      <MobileAskSheet
        isOpen={askSheetVisible}
        onClose={() => setAskSheetVisible(false)}
        remainingCalls={usageQuery.data?.limit && usageQuery.data ? Math.max(0, usageQuery.data.limit - usageQuery.data.used) : undefined}
        onAsk={async (q) => {
          const res = await askMutation.mutateAsync({ query: q });
          usageQuery.refetch();
          return res;
        }}
        onNavigatePrefill={(prefill) => {
          if (prefill.target === 'add-transaction' || prefill.target === 'mark-paid') {
            const amountStr = prefill.params?.amount ? String(prefill.params.amount) : '';
            const billOrMerchant = String(prefill.params?.billName || prefill.params?.merchant || prefill.params?.entityName || '');
            setQuickModalData({
              type: 'DEBIT',
              name: billOrMerchant,
              amount: amountStr,
              date: prefill.params?.date ? String(prefill.params.date) : undefined,
              envelopeName: billOrMerchant,
            });
            setQuickModalType('DEBIT');
            setQuickModalVisible(true);
          } else if (prefill.target === 'transfer') {
            const amountStr = prefill.params?.amount ? String(prefill.params.amount) : '';
            setQuickModalData({
              type: 'TRANSFER',
              amount: amountStr,
              sourcePoolName: prefill.params?.sourceAccount ? String(prefill.params.sourceAccount) : undefined,
              destinationPoolName: prefill.params?.destinationAccount ? String(prefill.params.destinationAccount) : undefined,
            });
            setQuickModalType('TRANSFER');
            setQuickModalVisible(true);
          } else if (prefill.target === 'afford-check') {
            const amountStr = prefill.params?.amount ? String(prefill.params.amount) : undefined;
            setAffordModalAmount(amountStr);
            setAffordModalVisible(true);
          } else if (prefill.target === 'create-bill' || prefill.target === 'create-income') {
            router.push('/(app)/paychecks' as never);
          } else if (prefill.target === 'history-filter') {
            router.push('/(app)/transactions' as never);
          } else if (prefill.target === 'navigate') {
            const screen = String(prefill.params?.screen || '');
            if (screen === 'income-and-bills') router.push('/(app)/paychecks' as never);
            else if (screen === 'envelopes') router.push('/(app)/envelopes' as never);
            else if (screen === 'bank-accounts') router.push('/(app)/bank-accounts' as never);
            else if (screen === 'settings') router.push('/(app)/settings' as never);
            else if (screen === 'history') router.push('/(app)/transactions' as never);
          }
        }}
      />

    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
});
