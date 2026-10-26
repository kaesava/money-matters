"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, ConfirmDialog } from "@money-matters/ui/web";
import { BentoPoolsSection } from "./components/BentoPoolsSection";
import { GoalsProgressStrip } from "./components/GoalsProgressStrip";
import { NextPaydayCard, WebIncomeItem } from "./components/NextPaydayCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";
import { QuickActionDrawer } from "../../components/web/QuickExpenseDrawer";
import { AffordCheckModal } from "../../components/web/AffordCheckModal";
import { ReconciliationModal, PoolItem } from "../../components/ReconciliationModal";
import { DashboardActionStrip } from "./components/DashboardActionStrip";
import { BalanceMatchNudgeBanner } from "./components/BalanceMatchNudgeBanner";
import { AffordCheckInlineCard } from "./components/AffordCheckInlineCard";
import { useDashboardData } from "./hooks/useDashboardData";
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

  const goalCategories = pools.filter((p) => p.envelopeType === "TARGET_GOAL" || p.envelopeType === "ONGOING_GOAL");
  const homeData = homeSummaryQuery.data;
  const everydayBalance = homeData?.everydayBalance ?? parseFloat(summaryQuery.data?.everydayRemaining || "0");
  const safeToSpend = homeData?.safeToSpend ?? everydayBalance;
  const dailyPace = homeData?.dailyPace;
  const paceStatus = homeData?.paceStatus;
  const everydayMonthlyBudget = pools
    .filter((p) => p.envelopeType === "EVERYDAY")
    .reduce((sum, p) => sum + parseFloat(p.monthlyAmount || p.targetAmount || "0"), 0);

  const everydaySafetyBuffer = pools
    .filter((p) => p.envelopeType === "EVERYDAY")
    .reduce((sum, p) => sum + parseFloat(p.safetyBufferFloor || "0"), 0);

  const billsBalance = homeData?.billsBalance ?? parseFloat(summaryQuery.data?.billsRemaining || "0");
  const billsMonthlyBudget = pools
    .filter((p) => p.envelopeType === "SCHEDULED_BILL" || p.envelopeType === "FLEXIBLE_BILL")
    .reduce((sum, p) => sum + parseFloat(p.monthlyAmount || p.targetAmount || "0"), 0);

  const bankAccounts = bankAccountsQuery.data ?? [];

  const upcomingIncomeList: WebIncomeItem[] = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === "PENDING")
    .map((e) => {
      const matchedAccount = bankAccounts.find((b) => b.id === e.bankAccountId);
      const availableToBudget = matchedAccount
        ? parseFloat(String(matchedAccount.lastKnownBalance || "0")) -
          parseFloat(String(matchedAccount.unbudgetedBuffer || "0"))
        : null;

      return {
        id: e.id,
        name: e.sourceName || "Paycheck Deposit",
        amount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        bankAccountId: e.bankAccountId ?? null,
        bankAccountName: matchedAccount?.name ?? null,
        availableToBudget,
      };
    });

  const nextPaycheck = upcomingIncomeList[0] ?? null;
  const daysUntilPayday = homeData?.daysToPayday ?? (nextPaycheck
    ? Math.max(0, Math.round((new Date(nextPaycheck.expectedDate + "T00:00:00Z").getTime() - new Date(todayStr + "T00:00:00Z").getTime()) / (1000 * 60 * 60 * 24)))
    : 14);

  // Show balance match nudge if accounts exist and oldest match is null or > 14 days ago (guarded by account age)
  const isBalanceMatchOverdue = React.useMemo(() => {
    if (bankAccounts.length === 0) return false;
    if (homeData?.oldestBalanceMatchAt) {
      const lastMatchDate = new Date(homeData.oldestBalanceMatchAt).getTime();
      return (Date.now() - lastMatchDate) > 14 * 24 * 60 * 60 * 1000;
    }
    if (homeData?.tenantCreatedAt) {
      const accountAge = Date.now() - new Date(homeData.tenantCreatedAt).getTime();
      return accountAge > 14 * 24 * 60 * 60 * 1000;
    }
    return false;
  }, [bankAccounts.length, homeData?.oldestBalanceMatchAt, homeData?.tenantCreatedAt]);

  const todayObj = new Date(todayStr);

  const expenseAttentionItems: WebAttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "PENDING")
    .map((e) => {
      const pool = pools.find((p) => p.id === e.envelopeId);
      const catBal = pool ? parseFloat(String(pool.currentBalance)) : 0;
      const isOverdue = new Date(e.expectedDate) < todayObj;

      return {
        id: e.id,
        type: "EXPENSE" as const,
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: pool?.id ?? null,
        categoryName: pool?.name ?? "Regular Bill",
        isOverdue,
        categoryBalance: catBal,
      };
    });

  const transferAttentionItems: WebAttentionItem[] = (transferEventsQuery.data ?? [])
    .filter((e) => e.status === "PENDING")
    .map((e) => {
      const srcPool = pools.find((p) => p.id === e.sourcePoolId);
      const destPool = pools.find((p) => p.id === e.destinationPoolId);
      const isOverdue = new Date(e.expectedDate) < todayObj;

      return {
        id: e.id,
        type: "TRANSFER" as const,
        name: e.name || `Transfer: ${srcPool?.name ?? "Source"} ➔ ${destPool?.name ?? "Destination"}`,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        sourcePoolId: e.sourcePoolId,
        sourcePoolName: srcPool?.name ?? e.sourcePoolName ?? "Source Pool",
        destinationPoolId: e.destinationPoolId,
        destinationPoolName: destPool?.name ?? e.destinationPoolName ?? "Destination Pool",
        isOverdue,
      };
    });

  const attentionItems: WebAttentionItem[] = [...expenseAttentionItems, ...transferAttentionItems]
    .sort((a, b) => {
      const aOverdue = a.isOverdue || a.expectedDate < todayStr;
      const bOverdue = b.isOverdue || b.expectedDate < todayStr;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
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
    reason?: string
  ) => {
    if (!reconcileState) return;
    const diff = Number(
      (
        Math.max(0, reconcileState.newBalance - reconcileState.unbudgetedBuffer) -
        reconcileState.expectedBalance
      ).toFixed(2)
    );

    if (Math.abs(diff) > 0.009 && splits.length > 0) {
      await reconcileMut.mutateAsync({
        accountId: reconcileState.accountId,
        actualBalance: reconcileState.newBalance.toFixed(2),
        clientIdempotencyToken: crypto.randomUUID(),
        splits,
        note: reason?.trim() || undefined,
      });
      toast.success(t("toasts.saved"));
    }

    utils.listPools.invalidate();
    utils.listTransactions.invalidate();
    await bankAccountsQuery.refetch();
    await summaryQuery.refetch();
    setReconcileState(null);
  };



  const upcomingBillsList = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "PENDING")
    .map((e) => ({
      id: e.id,
      name: e.name,
      amount: parseFloat(e.expectedAmount),
      dueDate: e.expectedDate,
    }));

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const billsDue14Days = upcomingBillsList.filter((b) => {
    const due = new Date(b.dueDate).getTime();
    return due >= new Date().getTime() - 86400000 && due <= new Date().getTime() + fourteenDaysMs;
  });

  const totalBillsDue14Days = billsDue14Days.reduce((sum, b) => sum + b.amount, 0);
  const billsShortfall = Math.max(0, totalBillsDue14Days - billsBalance);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Top Header Action Strip */}
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

      {/* Balance Match Nudge Banner (Overdue > 14 days) */}
      {isBalanceMatchOverdue && (
        <BalanceMatchNudgeBanner onOpenMatch={handleOpenEverydayReconciliation} />
      )}

      {/* Row 1: Hero Balances (Left) + Goals Motivation (Right) - All 3 Envelopes */}
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
            formatAUD={fmt}
          />
        </div>

        {/* Goals Progress: Motivation Front & Center */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <GoalsProgressStrip
            goalCategories={goalCategories.map((g) => ({
              id: g.id,
              name: g.name,
              currentBalance: String(g.currentBalance || "0"),
              healthStatus: g.healthStatus,
              targetAmount: g.targetAmount,
              endDate: g.endDate,
              goalMode: g.goalMode,
              enteredAmount: g.enteredAmount,
              budgetFrequency: g.budgetFrequency,
              createdAt: g.createdAt,
            }))}
            formatAUD={fmt}
          />
        </div>
      </div>

      {/* Inline Quick Afford Check Card */}
      <AffordCheckInlineCard
        onCheck={(amt) => {
          setAffordInitialAmount(amt);
          setIsAffordModalOpen(true);
        }}
      />

      {/* Row 2: Cashflow Stream (Two-Column Split: Upcoming Expenses & Upcoming Income) */}
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
            formatAUD={fmt}
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
            formatAUD={fmt}
          />
        </div>
      </div>

      {quickDrawerOpen && (
        <QuickActionDrawer
          onClose={() => setQuickDrawerOpen(false)}
          initialTab={quickDrawerInitialTab}
        />
      )}

      {isMoveMoneyOpen && (
        <QuickActionDrawer
          onClose={() => {
            setIsMoveMoneyOpen(false);
            poolsQuery.refetch();
          }}
          initialTab="TRANSFER"
        />
      )}

      {incomeToDelete && (
        <ConfirmDialog
          isOpen={!!incomeToDelete}
          title={t("common.deleteIncomeTitle")}
          description={t("common.deleteExpensePrompt", {
            name: incomeToDelete.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onConfirm={async () => {
            await deleteIncomeEventMutation.mutateAsync({ eventId: incomeToDelete.id });
            toast.success(t("toasts.deleted"));
            setIncomeToDelete(null);
          }}
          onClose={() => setIncomeToDelete(null)}
        />
      )}

      {isAffordModalOpen && (
        <AffordCheckModal
          isOpen={isAffordModalOpen}
          initialAmount={affordInitialAmount}
          onClose={() => {
            setIsAffordModalOpen(false);
            setAffordInitialAmount("");
          }}
        />
      )}

      {reconcileState && (
        <ReconciliationModal
          isOpen={Boolean(reconcileState)}
          onClose={() => setReconcileState(null)}
          accountName={reconcileState.accountName}
          expectedBalance={reconcileState.expectedBalance}
          newBalance={reconcileState.newBalance}
          unbudgetedBuffer={reconcileState.unbudgetedBuffer}
          pools={reconcileState.pools}
          onConfirm={handleConfirmReconcile}
          onOpenTransferModal={() => {
            setReconcileState(null);
            setIsMoveMoneyOpen(true);
          }}
        />
      )}
    </div>
  );
}


