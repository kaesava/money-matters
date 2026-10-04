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
import { BankBalancesStrip } from '../../components/dashboard/BankBalancesStrip';
import { TrialBanner } from '../../components/dashboard/TrialBanner';
import { MobileMissingSchedulesBanner } from '../../components/dashboard/MobileMissingSchedulesBanner';
import { MarkPaidModal, MarkPaidEvent } from '../../components/MarkPaidModal';
import { QuickExpenseModal, QuickActionType } from '../../components/QuickExpenseModal';
import { HomeAffordBannerCard } from '../../components/dashboard/HomeAffordBannerCard';
import { HomeQuickActionsGrid } from '../../components/dashboard/HomeQuickActionsGrid';
import { useHomeData } from '../../components/dashboard/useHomeData';

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const posthog = usePostHog();

  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickModalType, setQuickModalType] = useState<QuickActionType>('DEBIT');
  const [markPaidEvent, setMarkPaidEvent] = useState<MarkPaidEvent | null>(null);

  const {
    refreshing,
    onRefresh,
    bankAccounts,
    incomeCount,
    billsCount,
    everydayBalance,
    everydayMonthlyBudget,
    billsBalance,
    billsMonthlyBudget,
    daysUntilPayday,
    billsShortfall,
    billsDue14DaysCount,
    totalBillsDue14Days,
    needsAttentionCount,
    behindCount,
    onTrackCount,
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
          billsBalance={billsBalance}
          billsMonthlyBudget={billsMonthlyBudget}
          daysUntilPayday={daysUntilPayday}
          billsShortfall={billsShortfall}
          billsDue14DaysCount={billsDue14DaysCount}
          totalBillsDue14Days={totalBillsDue14Days}
          needsAttentionCount={needsAttentionCount}
          behindCount={behindCount}
          onTrackCount={onTrackCount}
          onMoveMoney={() => openQuickModal('TRANSFER')}
          onReconcile={() => router.push('/(app)/settings/bank-accounts' as never)}
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

        <HomeAffordBannerCard />

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
        <BankBalancesStrip accounts={bankAccounts} />
        <HomeQuickActionsGrid onOpenQuickModal={openQuickModal} />
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
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
  },
});
