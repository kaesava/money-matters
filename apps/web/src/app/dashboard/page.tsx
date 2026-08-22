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

  const hasExpenseEvents = (expenseEventsQuery.data ?? []).length > 0;
  const hasIncomeEvents = (incomeEventsQuery.data ?? []).length > 0;
  const showScheduleReminder = (!hasExpenseEvents || !hasIncomeEvents) && !expenseEventsQuery.isLoading && !incomeEventsQuery.isLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Friendly Reminder Banner for Missing Income or Expense Schedules */}
      {showScheduleReminder && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-teal-50/70 to-blue-50/90 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center text-xl shrink-0 font-bold border border-amber-200 shadow-2xs">
              💡
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#1B2B4B]">Complete Your Cashflow Automation</h4>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 border border-amber-300/80">
                  Action Recommended
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl">
                {!hasExpenseEvents && !hasIncomeEvents
                  ? "You haven't set up any upcoming income or bill expense schedules yet. Add your recurring paychecks and bills so Money Matters can automatically ring-fence your obligations on payday."
                  : !hasExpenseEvents
                  ? "You haven't set up any recurring bill expense schedules yet. Add your rent, utilities, and subscriptions so Money Matters can protect your bill pool when paychecks land."
                  : "You haven't set up any upcoming income schedules yet. Add your regular paychecks so Money Matters can automatically waterfall funds into your categories."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => router.push("/dashboard/income-and-bills")}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white transition-all shadow-sm text-center"
            >
              📅 Set Up Schedules
            </button>
            <button
              type="button"
              onClick={() => router.push("/setup?mode=rerun")}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors text-center"
            >
              ⚙️ Re-Run Setup
            </button>
          </div>
        </div>
      )}

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

      {/* Due-Date Guardrail Shortfall Amber Card */}
      {billsShortfall > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                Due-Date Shortfall Warning
              </span>
              <h4 className="text-xs font-bold text-[#1B2B4B] mt-0.5">
                Bills Pool Shortfall of <span className="font-mono text-amber-800 font-extrabold">{fmt(billsShortfall)}</span> Due in Next 14 Days
              </h4>
              <p className="text-[11px] text-amber-900 mt-0.5">
                You have {billsDue14Days.length} upcoming bill(s) totaling {fmt(totalBillsDue14Days)} due before next pay, but current Bills pool has {fmt(billsBalance)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMoveMoneyOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0 shadow-sm"
          >
            Move Money →
          </button>
        </div>
      )}

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/dashboard/settings/history")}
            className="px-3 py-2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
          >
            📥 Import Bank CSV
          </button>
          <button
            onClick={() => router.push("/dashboard/bank-accounts")}
            className="px-3 py-2 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors"
          >
            {t("dashboard.bankAccountTip.action")}
          </button>
        </div>
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
