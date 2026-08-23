"use client";

import React from "react";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";
import posthog from "../../lib/posthog-client";

import { DashboardHeroCard } from "./components/DashboardHeroCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";
import { ShortfallAlertCard } from "./components/ShortfallAlertCard";
import { OrientationProTipCard } from "./components/OrientationProTipCard";
import { MissingSchedulesBanner } from "./components/MissingSchedulesBanner";
import { DashboardModals } from "./components/DashboardModals";

import { QuickExpenseCard } from "@/components/web/dashboard/QuickExpenseCard";
import { BankReconcileCard } from "@/components/web/dashboard/BankReconcileCard";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AppPreferencesBlob {
  skip_pool_adjustment_confirmation?: boolean;
  quick_actions_collapsed?: boolean;
}

type AppPreferencesMap = Record<string, AppPreferencesBlob>;

import { useDashboardData } from "./hooks/useDashboardData";

export default function DashboardPage() {
  const {
    router,
    todayStr,
    moveMoneyOpen,
    setMoveMoneyOpen,
    paydayPreviewEventId,
    setPaydayPreviewEventId,
    quickType,
    setQuickType,
    quickName,
    setQuickName,
    quickCategoryId,
    setQuickCategoryId,
    quickReceivingAccountId,
    setQuickReceivingAccountId,
    quickAmount,
    setQuickAmount,
    quickDate,
    setQuickDate,
    quickNote,
    setQuickNote,
    quickMsg,
    canAffordAmount,
    setCanAffordAmount,
    reconcilingAccountId,
    setReconcilingAccountId,
    reconcileActualAmount,
    setReconcileActualAmount,
    reconcileTargetCategoryId,
    setReconcileTargetCategoryId,
    summaryQuery,
    categoriesQuery,
    bankAccountsQuery,
    incomeEventsQuery,
    expenseEventsQuery,
    canAffordQuery,
    reconcileMutation,
    recordExpenseMutation,
    markPaidMutation,
    skipExpenseMutation,
    updateUpcomingExpenseMutation,
  } = useDashboardData();

  const categories = categoriesQuery.data ?? [];
  const needsAttentionCount = categories.filter((c) => c.healthStatus === "AMBER").length;
  const behindCount = categories.filter((c) => c.healthStatus === "RED").length;
  const onTrackCount = categories.filter((c) => c.healthStatus === "GREEN").length;
  const everydayBalance = parseFloat(summaryQuery.data?.everydayRemaining || "0");
  const everydayMonthlyBudget = categories
    .filter((c) => c.type === "EVERYDAY")
    .reduce((sum, c) => sum + parseFloat(c.everydayAllowanceAmount || c.monthlyAmount || "0"), 0);

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
        }
      }
    });
  };

  const handleUpdatePoolBalance = async (poolType: 'EVERYDAY' | 'REGULAR', newAmount: number) => {
    const currentBalance = poolType === 'EVERYDAY' ? everydayBalance : billsBalance;
    const diff = newAmount - currentBalance;
    if (Math.abs(diff) < 0.01) return;

    const targetCat = categories.find((c) => c.type === poolType);
    if (!targetCat) {
      alert(`No category found of type ${poolType} to post the adjustment transaction.`);
      return;
    }

    await recordExpenseMutation.mutateAsync({
      amount: Math.abs(diff).toFixed(2),
      categoryId: targetCat.id,
      flowType: diff > 0 ? "CREDIT" : "DEBIT",
      note: `${poolType === 'EVERYDAY' ? 'Everyday' : 'Bills'} Pool Adjustment`,
      recordedAt: todayStr,
    });
  };

  const billsBalance = parseFloat(summaryQuery.data?.billsRemaining || "0");
  const billsMonthlyBudget = categories
    .filter((c) => c.type === "REGULAR")
    .reduce((sum, c) => sum + parseFloat(c.monthlyAmount || "0"), 0);

  const upcomingIncomeList = (incomeEventsQuery.data ?? []).filter((e) => e.status === "UPCOMING");
  const nextPaydayEvent = upcomingIncomeList[0] ?? null;

  const nextPaydayData = nextPaydayEvent
    ? {
        id: nextPaydayEvent.id,
        name: nextPaydayEvent.sourceName || "Paycheck Deposit",
        amount: parseFloat(nextPaydayEvent.expectedAmount),
        expectedDate: nextPaydayEvent.expectedDate,
      }
    : null;

  const todayObj = new Date(todayStr);
  const threeDaysLater = new Date(todayObj);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const attentionItems: WebAttentionItem[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .filter((e) => new Date(e.expectedDate) <= threeDaysLater)
    .map((e) => {
      const cat = categories.find((c) => c.id === e.categoryId);
      const catBal = cat ? parseFloat(cat.currentBalance) : 0;
      const isOverdue = new Date(e.expectedDate) < todayObj;
      return {
        id: e.id,
        name: e.name,
        expectedAmount: parseFloat(e.expectedAmount),
        expectedDate: e.expectedDate,
        categoryId: e.categoryId,
        categoryName: cat?.name ?? null,
        isOverdue,
        categoryBalance: catBal,
      };
    });

  const handleMarkPaidItem = (item: WebAttentionItem, amount: number, date: string) => {
    markPaidMutation.mutate(
      { eventId: item.id, actualAmount: amount.toFixed(2), recordedAt: date, note: `Paid ${item.name}` },
      {
        onSuccess: () => {
          posthog.capture("expense_marked_paid", { source: "attention_item" });
        },
      }
    );
  };

  const handleSkipItem = (item: WebAttentionItem) => {
    skipExpenseMutation.mutate({ eventId: item.id });
  };

  const handleSaveItem = (item: WebAttentionItem, amount: number, date: string) => {
    updateUpcomingExpenseMutation.mutate({
      eventId: item.id,
      expectedAmount: amount.toFixed(2),
      expectedDate: date,
    });
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordExpenseMutation.mutate(
      {
        amount: quickAmount,
        categoryId: quickCategoryId || categories.find((c) => c.type === "EVERYDAY")?.id || categories[0]?.id || "",
        flowType: quickType,
        note: quickName ? `${quickName}${quickNote ? `: ${quickNote}` : ''}` : (quickNote || undefined),
        recordedAt: quickDate,
      },
      {
        onSuccess: () => {
          posthog.capture("transaction_recorded", {
            flow_type: quickType,
            entry_method: "quick_action",
          });
        },
      }
    );
  };

  const bankAccountsMapped = (bankAccountsQuery.data ?? []).map((acc) => ({
    id: acc.id,
    name: acc.name,
    lastKnownBalance: acc.lastKnownBalance,
    expectedBalance: acc.expectedBalance,
  }));

  // Due-Date Guardrail Evaluation for upcoming bills in 14 days
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
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-[#1B2B4B]">
          {t("nav.dashboard") || "Dashboard"}
        </h1>
        <InfoTooltip
          title={t("tooltips.dashboard.title")}
          content={t("tooltips.dashboard.content")}
        />
      </div>
      <MissingSchedulesBanner
        incomeCount={incomeEventsQuery.data?.length ?? 0}
        billsCount={expenseEventsQuery.data?.length ?? 0}
      />

      <DashboardHeroCard
        everydayBalance={everydayBalance}
        everydayMonthlyBudget={everydayMonthlyBudget}
        billsBalance={billsBalance}
        billsMonthlyBudget={billsMonthlyBudget}
        needsAttentionCount={needsAttentionCount}
        behindCount={behindCount}
        onTrackCount={onTrackCount}
        canAffordAmount={canAffordAmount}
        setCanAffordAmount={setCanAffordAmount}
        canAffordData={canAffordQuery.data}
        nextPayday={nextPaydayData}
        onPressNextPay={(id) => setPaydayPreviewEventId(id)}
        onSelectFilter={(health) => router.push(`/dashboard/categories?health=${health}`)}
        formatAUD={fmt}
        onUpdatePoolBalance={handleUpdatePoolBalance}
        skipConfirmation={skipConfirmation}
        onSaveSkipConfirmation={handleSaveSkipConfirmation}
      />

      <ShortfallAlertCard
        billsShortfall={billsShortfall}
        billsDue14DaysCount={billsDue14Days.length}
        totalBillsDue14Days={totalBillsDue14Days}
        billsBalance={billsBalance}
        formatAUD={fmt}
        onMoveMoney={() => setMoveMoneyOpen(true)}
      />

      <OrientationProTipCard />


      {/* Attention Items */}
      <AttentionItemsList
        items={attentionItems}
        onMarkPaid={handleMarkPaidItem}
        onSkip={handleSkipItem}
        onSave={handleSaveItem}
        formatAUD={fmt}
        markingPaidId={markPaidMutation.isPending ? markPaidMutation.variables?.eventId : null}
        onNavigateCategory={(catName) => router.push(`/dashboard/categories?search=${encodeURIComponent(catName)}`)}
      />

      {/* Quick Actions & Bank Reconciliation Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickExpenseCard
            quickType={quickType}
            setQuickType={setQuickType}
            quickName={quickName}
            setQuickName={setQuickName}
            quickAmount={quickAmount}
            setQuickAmount={setQuickAmount}
            quickCategoryId={quickCategoryId}
            setQuickCategoryId={setQuickCategoryId}
            quickReceivingAccountId={quickReceivingAccountId}
            setQuickReceivingAccountId={setQuickReceivingAccountId}
            quickDate={quickDate}
            setQuickDate={setQuickDate}
            quickNote={quickNote}
            setQuickNote={setQuickNote}
            quickMsg={quickMsg}
            categories={categories}
            bankAccounts={bankAccountsQuery.data ?? []}
            isPending={recordExpenseMutation.isPending}
            onSubmit={handleQuickSubmit}
          />

          <BankReconcileCard
            accounts={bankAccountsMapped}
            onOpenSettings={() => router.push('/dashboard/settings')}
            onReconcile={(id: string, lastKnownBalance: string) => {
              setReconcilingAccountId(id);
              setReconcileActualAmount(lastKnownBalance);
            }}
            fmt={fmt}
          />
        </div>

      <DashboardModals
        reconcilingAccountId={reconcilingAccountId}
        onCloseReconcile={() => {
          setReconcilingAccountId(null);
          setReconcileActualAmount("");
          setReconcileTargetCategoryId("");
        }}
        reconcileActualAmount={reconcileActualAmount}
        setReconcileActualAmount={setReconcileActualAmount}
        reconcileTargetCategoryId={reconcileTargetCategoryId}
        setReconcileTargetCategoryId={setReconcileTargetCategoryId}
        categories={categories}
        isReconcilePending={reconcileMutation.isPending}
        onSubmitReconcile={(e) => {
          e.preventDefault();
          if (!reconcilingAccountId || !reconcileActualAmount) return;
          const targetCatId = reconcileTargetCategoryId || categories.find((c) => c.type === "EVERYDAY")?.id || categories[0]?.id;
          const acc = bankAccountsQuery.data?.find((a) => a.id === reconcilingAccountId);
          const expected = parseFloat(acc?.expectedBalance || "0");
          const actual = parseFloat(reconcileActualAmount);
          const diff = actual - expected;
          reconcileMutation.mutate({
            accountId: reconcilingAccountId,
            actualBalance: actual.toFixed(2),
            splits: targetCatId ? [{ categoryId: targetCatId, adjustment: diff.toFixed(2) }] : [],
          });
        }}
        moveMoneyOpen={moveMoneyOpen}
        onCloseMoveMoney={() => {
          setMoveMoneyOpen(false);
          summaryQuery.refetch();
        }}
        paydayPreviewEventId={paydayPreviewEventId}
        onClosePaydayPreview={() => setPaydayPreviewEventId(null)}
        onSuccessPaydayPreview={() => {
          setPaydayPreviewEventId(null);
          incomeEventsQuery.refetch();
          summaryQuery.refetch();
        }}
      />
    </div>
  );
}
