"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, InfoTooltip } from "@money-matters/ui/web";
import { BentoPoolsSection } from "./components/BentoPoolsSection";
import { GoalsProgressStrip } from "./components/GoalsProgressStrip";
import { NextPaydayCard, WebIncomeItem } from "./components/NextPaydayCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";
import { MissingSchedulesBanner } from "./components/MissingSchedulesBanner";
import { QuickActionDrawer } from "../../components/web/QuickExpenseDrawer";
import PaydayPreviewModal from "../../components/web/PaydayPreviewModal";
import { CanAffordModal } from "./components/CanAffordModal";
import { useDashboardData } from "./hooks/useDashboardData";
import posthog from "../../lib/posthog-client";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AppPreferencesMap {
  [appId: string]: {
    skip_pool_adjustment_confirmation?: boolean;
    [key: string]: unknown;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const poolsQuery = trpc.listPools.useQuery();
  const pools = poolsQuery.data ?? [];

  const {
    todayStr,
    summaryQuery,
    incomeEventsQuery,
    expenseEventsQuery,
    recordExpenseMutation,
    skipUpcomingExpenseMutation,
    updateUpcomingExpenseMutation,
    canAffordAmount,
    setCanAffordAmount,
    canAffordQuery,
  } = useDashboardData();

  const goalCategories = pools.filter((p) => p.poolType === "GOAL");
  const needsAttentionCount = pools.filter((p) => p.healthStatus === "AMBER").length;
  const behindCount = pools.filter((p) => p.healthStatus === "RED").length;
  const onTrackCount = pools.filter((p) => p.healthStatus === "GREEN").length;
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || "0");
  const everydayMonthlyBudget = pools
    .filter((p) => p.poolType === "EVERYDAY")
    .reduce((sum, p) => sum + parseFloat(p.everydayAllowanceAmount || p.targetAmount || "0"), 0);

  const userPreferencesQuery = trpc.getUserPreferences.useQuery();
  const appPrefs = userPreferencesQuery.data?.appPreferences as AppPreferencesMap | undefined;
  const prefsBlob = appPrefs?.["01908bde-34bb-7b19-a178-574211bc93aa"];
  const skipConfirmation = prefsBlob?.skip_pool_adjustment_confirmation ?? false;

  const updateUserPrefsMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPreferencesQuery.refetch(),
  });
  const handleSaveSkipConfirmation = async () => {
    await updateUserPrefsMutation.mutateAsync({
      appPreferences: {
        ["01908bde-34bb-7b19-a178-574211bc93aa"]: {
          skip_pool_adjustment_confirmation: true,
        },
      },
    });
  };

  const handleUpdatePoolBalance = async (poolType: "EVERYDAY" | "REGULAR", newAmount: number) => {
    const currentBalance = poolType === "EVERYDAY" ? everydayBalance : billsBalance;
    const diff = newAmount - currentBalance;
    if (Math.abs(diff) < 0.01) return;

    const targetPool = pools.find((p) => p.poolType === poolType) || pools[0];
    if (!targetPool) {
      toast.error(`No pool found of type ${poolType} to post the adjustment transaction.`);
      return;
    }

    await recordExpenseMutation.mutateAsync({
      amount: Math.abs(diff).toFixed(2),
      poolId: targetPool.id,
      flowType: diff > 0 ? "CREDIT" : "DEBIT",
      note: `${poolType === "EVERYDAY" ? "Everyday" : "Bills"} Pool Adjustment`,
      recordedAt: todayStr,
    });
  };

  const billsBalance = parseFloat(summaryQuery.data?.billsRemaining || "0");
  const billsMonthlyBudget = pools
    .filter((p) => p.poolType === "REGULAR")
    .reduce((sum, p) => sum + parseFloat(p.targetAmount || "0"), 0);

  const upcomingIncomeList: WebIncomeItem[] = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .map((e) => ({
      id: e.id,
      name: e.sourceName || "Paycheck Deposit",
      amount: parseFloat(e.expectedAmount),
      expectedDate: e.expectedDate,
    }));

  const todayObj = new Date(todayStr);

  // Guarantee at least 3 upcoming bills (sorted by date)
  const allUpcomingExpenses = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const attentionItems: WebAttentionItem[] = allUpcomingExpenses.map((e) => {
    const pool = pools.find((p) => p.id === e.poolId);
    const catBal = pool ? parseFloat(String(pool.currentBalance)) : 0;
    const isOverdue = new Date(e.expectedDate) < todayObj;

    return {
      id: e.id,
      name: e.name,
      expectedAmount: parseFloat(e.expectedAmount),
      expectedDate: e.expectedDate,
      categoryId: pool?.id ?? null,
      categoryName: pool?.name ?? "Regular Bill",
      isOverdue,
      categoryBalance: catBal,
    };
  });

  const handleMarkPaidItem = async (item: WebAttentionItem, amount: number, date: string) => {
    await recordExpenseMutation.mutateAsync({
      poolId: item.categoryId || pools[0]?.id || "",
      amount: amount.toFixed(2),
      note: `Bill Paid: ${item.name}`,
      recordedAt: date,
    });
    posthog.capture("bill_paid");
  };

  const handleSkipItem = async (item: WebAttentionItem) => {
    await skipUpcomingExpenseMutation.mutateAsync({ eventId: item.id, eventType: "EXPENSE", status: "SKIPPED" });
  };

  const handleSaveItem = async (item: WebAttentionItem, amount: number, date: string) => {
    await updateUpcomingExpenseMutation.mutateAsync({
      eventId: item.id,
      eventType: "EXPENSE",
      expectedAmount: amount.toFixed(2),
      expectedDate: date,
    });
  };

  const [paydayPreviewEventId, setPaydayPreviewEventId] = useState<string | null>(null);
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [quickDrawerInitialTab, setQuickDrawerInitialTab] = useState<"DEBIT" | "CREDIT" | "TRANSFER">("DEBIT");
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);
  const [isCanAffordModalOpen, setIsCanAffordModalOpen] = useState(false);

  const upcomingBillsList = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
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
          <h1 className="text-2xl font-bold text-[#1B2B4B]">
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
            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Quick Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickDrawerInitialTab("CREDIT");
              setQuickDrawerOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Quick Income</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMoveMoneyOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>💸 Move Money</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCanAffordModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🤔 Can I Afford It?</span>
          </button>
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
            needsAttentionCount={needsAttentionCount}
            behindCount={behindCount}
            onTrackCount={onTrackCount}
            onSelectFilter={(health: string) => router.push(`/dashboard/pools?health=${health}`)}
            onMoveMoney={() => setIsMoveMoneyOpen(true)}
            formatAUD={fmt}
            onUpdatePoolBalance={handleUpdatePoolBalance}
            skipConfirmation={skipConfirmation}
            onSaveSkipConfirmation={handleSaveSkipConfirmation}
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
            }))}
            formatAUD={fmt}
          />
        </div>
      </div>

      {/* Row 2: Cashflow Stream (Upcoming Bills & Upcoming Paydays) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <AttentionItemsList
            items={attentionItems}
            onMarkPaid={handleMarkPaidItem}
            onSkip={handleSkipItem}
            onSave={handleSaveItem}
            formatAUD={fmt}
          />
        </div>
        <div className="lg:col-span-5">
          <NextPaydayCard
            upcomingIncomes={upcomingIncomeList}
            onPressNextPay={(id: string) => setPaydayPreviewEventId(id)}
            formatAUD={fmt}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      {paydayPreviewEventId && (
        <PaydayPreviewModal
          incomeEventId={paydayPreviewEventId}
          isOpen={!!paydayPreviewEventId}
          onClose={() => setPaydayPreviewEventId(null)}
        />
      )}

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

      {isCanAffordModalOpen && (
        <CanAffordModal
          isOpen={isCanAffordModalOpen}
          onClose={() => setIsCanAffordModalOpen(false)}
          canAffordAmount={canAffordAmount}
          setCanAffordAmount={setCanAffordAmount}
          canAffordData={canAffordQuery.data}
        />
      )}
    </div>
  );
}


