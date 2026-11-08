"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast } from "@money-matters/ui/web";
import { BentoPoolsSection } from "./components/BentoPoolsSection";
import { GoalsProgressStrip } from "./components/GoalsProgressStrip";
import { NextPaydayCard } from "./components/NextPaydayCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";
import { PoolItem } from "../../components/ReconciliationModal";
import { DashboardActionStrip } from "./components/DashboardActionStrip";
import { BalanceMatchNudgeBanner } from "./components/BalanceMatchNudgeBanner";
import { DashboardModals } from "./components/DashboardModals";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardDerivedState } from "./hooks/useDashboardDerivedState";
import { useLocale } from "../../providers/LocaleProvider";
import posthog from "../../lib/posthog-client";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();
  const { fmt } = useLocale();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  const poolsQuery = trpc.listPools.useQuery();
  const pools = poolsQuery.data ?? [];

  const {
    todayStr,
    summaryQuery,
    homeSummaryQuery,
    bankAccountsQuery,
    incomeEventsQuery,
    expenseEventsQuery,
    transferEventsQuery,
    markExpensePaidMutation,
    deleteExpenseEventMutation,
    deleteIncomeEventMutation,
    deleteTransferEventMutation,
    executeTransferEventMutation,
    updateTransferEventMutation,
  } = useDashboardData();

  const [incomeToDelete, setIncomeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [quickDrawerInitialTab, setQuickDrawerInitialTab] = useState<"DEBIT" | "CREDIT" | "TRANSFER">("DEBIT");
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [isAffordModalOpen, setIsAffordModalOpen] = useState(false);
  const [affordInitialAmount, setAffordInitialAmount] = useState("");
  const [reconcileState, setReconcileState] = useState<{
    accountName: string;
    accountId: string;
    newBalance: number;
    expectedBalance: number;
    unbudgetedBuffer: number;
    pools: PoolItem[];
  } | null>(null);

  const bankAccounts = bankAccountsQuery.data ?? [];
  const homeData = homeSummaryQuery.data;

  const {
    goalCategories,
    everydayBalance,
    safeToSpend,
    dailyPace,
    paceStatus,
    everydayMonthlyBudget,
    everydaySafetyBuffer,
    billsBalance,
    billsMonthlyBudget,
    upcomingIncomeList,
    daysUntilPayday,
    isBalanceMatchOverdue,
    attentionItems,
    billsDue14Days,
    totalBillsDue14Days,
    billsShortfall,
  } = useDashboardDerivedState({
    pools,
    bankAccounts,
    homeData,
    summaryData: summaryQuery.data,
    incomeEvents: incomeEventsQuery.data,
    expenseEvents: expenseEventsQuery.data,
    transferEvents: transferEventsQuery.data,
    todayStr,
  });

  const handleMarkPaidItem = async (item: WebAttentionItem, amount: number, date: string) => {
    await markExpensePaidMutation.mutateAsync({
      eventId: item.id,
      amount: amount.toFixed(2),
      date,
      note: `${item.name} (Paid on ${date})`,
    });
    toast.success(t("toasts.expenseMarkedPaid"));
    posthog.capture("bill_paid");
  };

  const handleSkipExpense = async (item: WebAttentionItem) => {
    await deleteExpenseEventMutation.mutateAsync({ eventId: item.id });
    toast.success(t("toasts.expenseDeleted"));
  };

  const handleSaveTransferDraft = async (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
  }) => {
    await updateTransferEventMutation.mutateAsync({
      eventId: params.eventId,
      name: params.name,
      amount: params.amount,
      expectedDate: params.expectedDate,
    });
    toast.success(t("toasts.transferSaved"));
  };

  const handleExecuteTransfer = async (params: {
    eventId: string;
    name: string;
    amount: string;
    sourcePoolId?: string;
    destinationPoolId?: string;
  }) => {
    await executeTransferEventMutation.mutateAsync({
      eventId: params.eventId,
      name: params.name,
      amount: params.amount,
      sourcePoolId: params.sourcePoolId,
      destinationPoolId: params.destinationPoolId,
    });
    toast.success(t("toasts.transferCompleted"));
  };

  const handleDeleteTransfer = async (eventId: string) => {
    await deleteTransferEventMutation.mutateAsync({ eventId });
    toast.success(t("toasts.transferDeleted"));
  };

  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  const handleOpenEverydayReconciliation = () => {
    const everydayPool = pools.find((p) => p.envelopeType === "EVERYDAY");
    const matchedAccount = bankAccounts.find(
      (b) => b.id === everydayPool?.bankAccountId
    ) || bankAccounts[0];

    if (!matchedAccount) {
      toast.error(t("common.error"));
      return;
    }

    const linkedPools = pools
      .filter((p) => p.bankAccountId === matchedAccount.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        poolType: p.envelopeType,
        envelopeType: p.envelopeType,
        currentBalance: parseFloat(String(p.currentBalance ?? 0)),
        isSurplusTarget: Boolean(p.isSurplusTarget),
      }));

    const actualBal = parseFloat(matchedAccount.lastKnownBalance || "0");
    const buf = parseFloat(matchedAccount.unbudgetedBuffer || "0");
    const expected = linkedPools.reduce((sum, p) => sum + p.currentBalance, 0);

    setReconcileState({
      accountName: matchedAccount.name,
      accountId: matchedAccount.id,
      newBalance: actualBal,
      expectedBalance: expected,
      unbudgetedBuffer: buf,
      pools: linkedPools,
    });
  };

  const handleConfirmReconcile = async (
    splits: Array<{ poolId: string; adjustment: string }>,
    actualBalance: string,
    reason?: string
  ) => {
    if (!reconcileState) return;
    const actualBalNum = Math.max(0, parseFloat(actualBalance) || 0);

    await reconcileMut.mutateAsync({
      accountId: reconcileState.accountId,
      actualBalance: actualBalNum.toFixed(2),
      clientIdempotencyToken: crypto.randomUUID(),
      splits,
      note: reason?.trim() || undefined,
    });
    toast.success(t("toasts.saved"));

    utils.listPools.invalidate();
    utils.listTransactions.invalidate();
    await bankAccountsQuery.refetch();
    await summaryQuery.refetch();
    setReconcileState(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6 animate-in fade-in duration-200">
      <DashboardActionStrip
        onOpenQuickExpense={() => {
          setQuickDrawerInitialTab("DEBIT");
          setQuickDrawerOpen(true);
        }}
        onOpenQuickIncome={() => {
          setQuickDrawerInitialTab("CREDIT");
          setQuickDrawerOpen(true);
        }}
        onOpenMoveMoney={() => setIsMoveMoneyOpen(true)}
        onOpenAffordCheck={() => {
          setAffordInitialAmount("");
          setIsAffordModalOpen(true);
        }}
        onOpenAskPenny={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("open-ask-penny"));
          }
        }}
      />

      {isBalanceMatchOverdue && (
        <BalanceMatchNudgeBanner onOpenMatch={handleOpenEverydayReconciliation} />
      )}

      <div data-tour="envelopes-row" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <BentoPoolsSection
            everydayBalance={everydayBalance}
            everydayMonthlyBudget={everydayMonthlyBudget}
            safetyBufferFloor={everydaySafetyBuffer}
            billsBalance={billsBalance}
            billsMonthlyBudget={billsMonthlyBudget}
            daysUntilPayday={daysUntilPayday}
            safeToSpend={safeToSpend}
            dailyPace={dailyPace}
            paceStatus={paceStatus}
            isAwaitingFirstPayday={homeData?.isAwaitingFirstPayday}
            billsShortfall={billsShortfall}
            billsDue14DaysCount={billsDue14Days.length}
            totalBillsDue14Days={totalBillsDue14Days}
            onMoveMoney={() => setIsMoveMoneyOpen(true)}
            onAlignEverydayBalance={handleOpenEverydayReconciliation}
            formatCurrency={fmt}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between">
          <GoalsProgressStrip
            goalCategories={goalCategories.map((g) => ({
              id: g.id,
              name: g.name,
              currentBalance: String(g.currentBalance || "0"),
              healthStatus: g.healthStatus || undefined,
              targetAmount: g.targetAmount,
              endDate: g.endDate,
              goalMode: (g.goalMode as "TARGET_DATE" | "ONGOING") ?? undefined,
              enteredAmount: g.enteredAmount,
              budgetFrequency: g.budgetFrequency,
              createdAt: g.createdAt,
            }))}
            formatCurrency={fmt}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6">
          <AttentionItemsList
            items={attentionItems}
            availableCategories={pools.map((p) => ({
              id: p.id,
              name: p.name,
              poolType: p.envelopeType,
              currentBalance: parseFloat(String(p.currentBalance || "0")),
              isSurplusTarget: p.isSurplusTarget,
              bankAccountId: p.bankAccountId,
            }))}
            onMarkPaid={handleMarkPaidItem}
            onSkipExpense={handleSkipExpense}
            onSaveTransferDraft={handleSaveTransferDraft}
            onExecuteTransfer={handleExecuteTransfer}
            onDeleteTransfer={handleDeleteTransfer}
            onConfirmTransferAndPay={async (transfers, destinationCategoryId) => {
              await Promise.all(
                transfers.map((t) =>
                  moveMoneyMut.mutateAsync({
                    sourceEnvelopeId: t.poolId,
                    destinationEnvelopeId: destinationCategoryId,
                    amount: t.amount,
                    note: "Shortfall Top Up",
                  })
                )
              );
              await utils.listPools.invalidate();
              await utils.listTransactions.invalidate();
            }}
            formatCurrency={fmt}
          />
        </div>
        <div className="lg:col-span-6">
          <NextPaydayCard
            upcomingIncomes={upcomingIncomeList}
            onPressRunSplit={(id: string) => {
              router.push(`/dashboard/income-split?id=${id}&returnTo=/dashboard`);
            }}
            onDeleteIncome={(id: string) => {
              const matched = upcomingIncomeList.find((item) => item.id === id);
              setIncomeToDelete({ id, name: matched?.name || "Income" });
            }}
            formatCurrency={fmt}
          />
        </div>
      </div>

      <DashboardModals
        quickDrawerOpen={quickDrawerOpen}
        onCloseQuickDrawer={() => setQuickDrawerOpen(false)}
        quickDrawerInitialTab={quickDrawerInitialTab}
        isMoveMoneyOpen={isMoveMoneyOpen}
        onCloseMoveMoney={() => {
          setIsMoveMoneyOpen(false);
          poolsQuery.refetch();
        }}
        incomeToDelete={incomeToDelete}
        onConfirmDeleteIncome={async () => {
          if (!incomeToDelete) return;
          await deleteIncomeEventMutation.mutateAsync({ eventId: incomeToDelete.id });
          toast.success(t("toasts.deleted"));
          setIncomeToDelete(null);
        }}
        onCloseDeleteIncome={() => setIncomeToDelete(null)}
        isAffordModalOpen={isAffordModalOpen}
        affordInitialAmount={affordInitialAmount}
        onCloseAffordModal={() => {
          setIsAffordModalOpen(false);
          setAffordInitialAmount("");
        }}
        reconcileState={reconcileState}
        onCloseReconcile={() => setReconcileState(null)}
        onConfirmReconcile={handleConfirmReconcile}
        onOpenTransferModal={() => {
          setReconcileState(null);
          setIsMoveMoneyOpen(true);
        }}
      />
    </div>
  );
}
