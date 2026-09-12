"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, InfoTooltip, ConfirmDialog } from "@money-matters/ui/web";
import { BentoPoolsSection } from "./components/BentoPoolsSection";
import { GoalsProgressStrip } from "./components/GoalsProgressStrip";
import { NextPaydayCard, WebIncomeItem } from "./components/NextPaydayCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";
import { MissingSchedulesBanner } from "./components/MissingSchedulesBanner";
import { QuickActionDrawer } from "../../components/web/QuickExpenseDrawer";
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

  const goalCategories = pools.filter((p) => p.poolType === "GOAL");
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || "0");
  const everydayMonthlyBudget = pools
    .filter((p) => p.poolType === "EVERYDAY")
    .reduce((sum, p) => sum + parseFloat(p.everydayAllowanceAmount || p.targetAmount || "0"), 0);

  const billsBalance = parseFloat(summaryQuery.data?.billsRemaining || "0");
  const billsMonthlyBudget = pools
    .filter((p) => p.poolType === "REGULAR")
    .reduce((sum, p) => sum + parseFloat(p.targetAmount || "0"), 0);

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

  const todayObj = new Date(todayStr);

  const expenseAttentionItems: WebAttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "PENDING")
    .map((e) => {
      const pool = pools.find((p) => p.id === e.poolId);
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
    toast.success(t("toasts.expenseMarkedPaid", { defaultValue: "Expense marked as spent." }));
    posthog.capture("bill_paid");
  };

  const handleSkipExpense = async (item: WebAttentionItem) => {
    await deleteExpenseEventMutation.mutateAsync({ eventId: item.id });
    toast.success(t("toasts.expenseDeleted", { defaultValue: "Expense deleted." }));
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
    toast.success(t("toasts.transferSaved", { defaultValue: "Transfer saved" }));
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
    toast.success(t("toasts.transferCompleted", { defaultValue: "Transfer completed" }));
  };

  const handleDeleteTransfer = async (eventId: string) => {
    await deleteTransferEventMutation.mutateAsync({ eventId });
    toast.success(t("toasts.transferDeleted", { defaultValue: "Transfer deleted" }));
  };

  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [quickDrawerInitialTab, setQuickDrawerInitialTab] = useState<"DEBIT" | "CREDIT" | "TRANSFER">("DEBIT");
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

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
      {/* Top Header Row with Side-by-Side Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-3xl font-extrabold text-[#1B2B4B] tracking-tight">
            {t("nav.dashboard") || "Dashboard"}
          </h1>
          <InfoTooltip
            title={t("tooltips.dashboard.title")}
            content={t("tooltips.dashboard.content")}
          />
        </div>

        {/* Header Action Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setQuickDrawerInitialTab("DEBIT");
              setQuickDrawerOpen(true);
            }}
            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center cursor-pointer"
          >
            <span>Quick Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickDrawerInitialTab("CREDIT");
              setQuickDrawerOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center cursor-pointer"
          >
            <span>{t("dashboard.quickIncome", { defaultValue: "Quick Income" })}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMoveMoneyOpen(true)}
            className="px-4 py-2 bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center cursor-pointer"
          >
            <span>{t("dashboard.transferBetweenPools", { defaultValue: "Transfer between Pools" })}</span>
          </button>

          <Link
            href="/dashboard/afford-check"
            className="px-4 py-2 bg-[#1B2B4B] hover:bg-[#111c33] text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center cursor-pointer"
          >
            <span>{t("canIAfford.title", { defaultValue: "Can I Afford It?" })}</span>
          </Link>
        </div>
      </div>

      <MissingSchedulesBanner
        incomeCount={incomeEventsQuery.data?.length ?? 0}
        billsCount={expenseEventsQuery.data?.length ?? 0}
      />

      {/* Row 1: Hero Balances (Left) + Goals Motivation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <BentoPoolsSection
            everydayBalance={everydayBalance}
            everydayMonthlyBudget={everydayMonthlyBudget}
            billsBalance={billsBalance}
            billsMonthlyBudget={billsMonthlyBudget}
            billsShortfall={billsShortfall}
            billsDue14DaysCount={billsDue14Days.length}
            totalBillsDue14Days={totalBillsDue14Days}
            onMoveMoney={() => setIsMoveMoneyOpen(true)}
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
              targetDate: g.targetDate,
              createdAt: g.createdAt,
            }))}
            formatAUD={fmt}
          />
        </div>
      </div>

      {/* Row 2: Cashflow Stream (Two-Column Split: Upcoming Expenses & Upcoming Income) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6">
          <AttentionItemsList
            items={attentionItems}
            availableCategories={pools.map((p) => ({
              id: p.id,
              name: p.name,
              poolType: p.poolType,
              currentBalance: parseFloat(String(p.currentBalance || "0")),
              isSurplusTarget: p.isSurplusTarget,
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
                    sourcePoolId: t.poolId,
                    destinationPoolId: destinationCategoryId,
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
          title={t("common.deleteIncomeTitle", { defaultValue: "Delete Income" })}
          description={t("common.deleteExpensePrompt", {
            name: incomeToDelete.name,
            defaultValue: `Are you sure you want to delete "${incomeToDelete.name}"?`,
          })}
          confirmLabel={t("common.delete", { defaultValue: "Delete" })}
          cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
          variant="danger"
          onConfirm={async () => {
            await deleteIncomeEventMutation.mutateAsync({ eventId: incomeToDelete.id });
            toast.success(t("toasts.deleted", { defaultValue: "Deleted successfully" }));
            setIncomeToDelete(null);
          }}
          onClose={() => setIncomeToDelete(null)}
        />
      )}
    </div>
  );
}


