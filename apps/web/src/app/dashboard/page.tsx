"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";
import posthog from "../../lib/posthog-client";
import { MoveMoneyModal } from "../../components/web/MoveMoneyModal";
import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";

import { DashboardHeroCard } from "./components/DashboardHeroCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";

import { QuickExpenseCard } from "@/components/web/dashboard/QuickExpenseCard";
import { BankReconcileCard } from "@/components/web/dashboard/BankReconcileCard";
import { BankReconcileModal } from "@/components/web/dashboard/BankReconcileModal";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AppPreferencesBlob {
  skip_pool_adjustment_confirmation?: boolean;
  quick_actions_collapsed?: boolean;
}

type AppPreferencesMap = Record<string, AppPreferencesBlob>;

export default function DashboardPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Date().toISOString().split("T")[0];

  const [moveMoneyOpen, setMoveMoneyOpen] = useState(false);
  const [paydayPreviewEventId, setPaydayPreviewEventId] = useState<string | null>(null);

  const [quickType, setQuickType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [quickName, setQuickName] = useState("");
  const [quickCategoryId, setQuickCategoryId] = useState("");
  const [quickReceivingAccountId, setQuickReceivingAccountId] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDate, setQuickDate] = useState(() => todayStr);
  const [quickNote, setQuickNote] = useState("");
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  const [canAffordAmount, setCanAffordAmount] = useState("");
  const [reconcilingAccountId, setReconcilingAccountId] = useState<string | null>(null);
  const [reconcileActualAmount, setReconcileActualAmount] = useState("");
  const [reconcileTargetCategoryId, setReconcileTargetCategoryId] = useState("");

  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const canAffordQuery = trpc.canAfford.useQuery(
    { amount: canAffordAmount },
    { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 }
  );

  const reconcileMutation = trpc.reconcileBankBalance.useMutation({
    onSuccess: () => {
      setReconcilingAccountId(null);
      setReconcileActualAmount("");
      setReconcileTargetCategoryId("");
      bankAccountsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
      posthog.capture("bank_account_reconciled");
    },
  });

  // Redirect to setup wizard if user has no categories configured
  useEffect(() => {
    if (categoriesQuery.isSuccess && categoriesQuery.data && categoriesQuery.data.length === 0) {
      router.push("/setup");
    }
  }, [categoriesQuery.isSuccess, categoriesQuery.data, router]);

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: (_, variables) => {
      utils.listTransactions.invalidate();
      categoriesQuery.refetch();
      summaryQuery.refetch();
      setQuickName("");
      setQuickAmount("");
      setQuickNote("");
      setQuickMsg(variables.flowType === "CREDIT" ? "Income recorded successfully!" : "Expense recorded successfully!");
      setTimeout(() => setQuickMsg(null), 3000);
    },
  });

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },
  });

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

  const skipExpenseMutation = trpc.skipExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
    },
  });

  const updateUpcomingExpenseMutation = trpc.updateUpcomingExpense.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
    },
  });

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
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

      {/* Orientation Pro Tip Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
        <div className="space-y-1 max-w-xl">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
            {t("dashboard.bankAccountTip.title")}
          </h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            {t("dashboard.bankAccountTip.description")}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/settings/bank-accounts")}
          className="px-3 py-2 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors shrink-0"
        >
          {t("dashboard.bankAccountTip.action")}
        </button>
      </div>

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

      {/* Modals */}
      {reconcilingAccountId && (
        <BankReconcileModal
          reconcilingAccountId={reconcilingAccountId}
          onClose={() => {
            setReconcilingAccountId(null);
            setReconcileActualAmount("");
            setReconcileTargetCategoryId("");
          }}
          reconcileActualAmount={reconcileActualAmount}
          setReconcileActualAmount={setReconcileActualAmount}
          reconcileTargetCategoryId={reconcileTargetCategoryId}
          setReconcileTargetCategoryId={setReconcileTargetCategoryId}
          categories={categories}
          isPending={reconcileMutation.isPending}
          onSubmit={(e) => {
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
        />
      )}

      {moveMoneyOpen && (
        <MoveMoneyModal isOpen={moveMoneyOpen} onClose={() => setMoveMoneyOpen(false)} onSuccess={() => summaryQuery.refetch()} />
      )}

      {paydayPreviewEventId && (
        <PaydayPreviewModal
          isOpen={!!paydayPreviewEventId}
          incomeEventId={paydayPreviewEventId}
          onClose={() => setPaydayPreviewEventId(null)}
          onSuccess={() => { setPaydayPreviewEventId(null); incomeEventsQuery.refetch(); summaryQuery.refetch(); }}
        />
      )}
    </div>
  );
}
