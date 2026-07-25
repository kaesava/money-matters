"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { MoveMoneyModal } from "../../components/web/MoveMoneyModal";
import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";
import UpcomingExpenseModal from "@/components/web/UpcomingExpenseModal";

import { DashboardHeaderHero } from "@/components/web/dashboard/DashboardHeaderHero";
import { DashboardMetricsCards } from "@/components/web/dashboard/DashboardMetricsCards";
import { QuickExpenseCard } from "@/components/web/dashboard/QuickExpenseCard";
import { BankReconcileCard } from "@/components/web/dashboard/BankReconcileCard";
import { CanAffordCard } from "@/components/web/dashboard/CanAffordCard";
import { UpcomingEventsList, UpcomingEvent } from "@/components/web/dashboard/UpcomingEventsList";

import { BankReconcileModal } from "@/components/web/dashboard/BankReconcileModal";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = new Date().toISOString().split("T")[0];

  // Preferences & State
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
  const [moveMoneyOpen, setMoveMoneyOpen] = useState(false);

  // Payday & Upcoming Modal States
  const [paydayPreviewEventId, setPaydayPreviewEventId] = useState<string | null>(null);
  const [upcomingExpenseToEdit, setUpcomingExpenseToEdit] = useState<any | null>(null);
  const [upcomingIncomeToEdit, setUpcomingIncomeToEdit] = useState<any | null>(null);
  const [selectedEventKeys, setSelectedEventKeys] = useState<string[]>([]);

  // Quick Expense / Income Form State
  const [quickType, setQuickType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [quickName, setQuickName] = useState("");
  const [quickCategoryId, setQuickCategoryId] = useState("");
  const [quickReceivingAccountId, setQuickReceivingAccountId] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDate, setQuickDate] = useState(() => todayStr);
  const [quickNote, setQuickNote] = useState("");
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  // Can Afford State
  const [canAffordAmount, setCanAffordAmount] = useState("");

  // Reconcile State
  const [reconcilingAccountId, setReconcilingAccountId] = useState<string | null>(null);
  const [reconcileActualAmount, setReconcileActualAmount] = useState("");
  const [reconcileTargetCategoryId, setReconcileTargetCategoryId] = useState("");

  // Upcoming Filter & Search State
  const [upcomingFilter, setUpcomingFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [upcomingSearch, setUpcomingSearch] = useState("");

  // Queries
  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const canAffordQuery = trpc.canAfford.useQuery({ amount: canAffordAmount }, { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 });

  // Bulk Delete Mutation
  const bulkDeleteEventsMutation = trpc.bulkDeleteEvents.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
      expenseEventsQuery.refetch();
      setSelectedEventKeys([]);
    },
  });

  // Mutations
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

  const createUpcomingExpenseMut = trpc.createUpcomingExpense.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      setQuickName("");
      setQuickAmount("");
      setQuickNote("");
      setQuickMsg("Future expense event scheduled successfully!");
      setTimeout(() => setQuickMsg(null), 3000);
    },
  });

  const createUpcomingIncomeMut = trpc.createUpcomingIncome.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
      setQuickName("");
      setQuickAmount("");
      setQuickNote("");
      setQuickMsg("Future income event scheduled successfully!");
      setTimeout(() => setQuickMsg(null), 3000);
    },
  });

  const reconcileMutation = trpc.reconcileBankBalance.useMutation({
    onSuccess: () => {
      utils.listTransactions.invalidate();
      bankAccountsQuery.refetch();
      categoriesQuery.refetch();
      setReconcilingAccountId(null);
    },
  });

  useEffect(() => {
    if (userPrefQuery.data) {
      setIsQuickActionsOpen(!userPrefQuery.data.quickActionsCollapsed);
    }
  }, [userPrefQuery.data]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoveMoneyOpen(false);
        setUpcomingExpenseToEdit(null);
        setUpcomingIncomeToEdit(null);
        setReconcilingAccountId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleQuickActions = () => {
    const nextState = !isQuickActionsOpen;
    setIsQuickActionsOpen(nextState);
    updateUserPrefMutation.mutate({ quickActionsCollapsed: !nextState });
  };

  const categories = categoriesQuery.data ?? [];
  const atRiskCount = categories.filter((c) => c.healthStatus === "AMBER").length;
  const missedCount = categories.filter((c) => c.healthStatus === "RED").length;

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(quickAmount);
    if (!quickName.trim() || isNaN(amtNum) || amtNum < 0) return;

    const isFutureDate = quickDate > todayStr;

    if (quickType === "DEBIT") {
      if (!quickCategoryId) return;
      if (isFutureDate) {
        createUpcomingExpenseMut.mutate({
          name: quickName,
          amount: amtNum.toFixed(2),
          categoryId: quickCategoryId,
          expectedDate: quickDate,
          note: quickNote,
        });
      } else {
        const targetCat = categories.find((c) => c.id === quickCategoryId);
        if (targetCat) {
          const currentBal = parseFloat(targetCat.currentBalance || "0");
          if (amtNum > currentBal) {
            if (!confirm(`Warning: Recording this expense of ${fmt(amtNum)} exceeds "${targetCat.name}" balance (${fmt(currentBal)}). Category balance will become negative (${fmt(currentBal - amtNum)}). Do you wish to proceed?`)) {
              return;
            }
          }
        }
        recordExpenseMutation.mutate({
          categoryId: quickCategoryId,
          amount: amtNum.toFixed(2),
          flowType: "DEBIT",
          note: quickNote || `Quick Expense: ${quickName}`,
          recordedAt: new Date(quickDate).toISOString(),
        });
      }
    } else {
      createUpcomingIncomeMut.mutate(
        {
          name: quickName,
          amount: amtNum.toFixed(2),
          expectedDate: quickDate,
          receivingAccountId: quickReceivingAccountId || undefined,
          note: quickNote,
        },
        {
          onSuccess: (createdEvt) => {
            setPaydayPreviewEventId(createdEvt.id);
          },
        }
      );
    }
  };


  const incomeEventsMapped: UpcomingEvent[] = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .map((e) => ({
      id: e.id,
      type: "INCOME",
      name: e.sourceName || "Paycheck Deposit",
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: "Income Allocation",
      categoryId: null,
      note: "Income Deposit",
      isNextPayday: "isNextPayday" in e ? Boolean(e.isNextPayday) : false,
      isRecurring: Boolean(e.incomeSourceId),
      seriesId: e.incomeSourceId || undefined,
      seriesName: e.incomeSourceId ? (e.sourceName || "Paycheck Deposit") : undefined,
    }));

  const expenseEventsMapped: UpcomingEvent[] = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .map((e) => ({
      id: e.id,
      type: "EXPENSE",
      name: e.name,
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: e.categoryName || "Uncategorized",
      categoryId: e.categoryId,
      note: e.note || "Bill/Expense",
      isNextPayday: false,
      isRecurring: Boolean(e.expenseSourceId),
      seriesId: e.expenseSourceId || undefined,
      seriesName: e.expenseSourceId ? (e.categoryName || e.name) : undefined,
    }));

  let combinedUpcoming = [...incomeEventsMapped, ...expenseEventsMapped];

  if (upcomingFilter === "INCOME") {
    combinedUpcoming = combinedUpcoming.filter((e) => e.type === "INCOME");
  } else if (upcomingFilter === "EXPENSE") {
    combinedUpcoming = combinedUpcoming.filter((e) => e.type === "EXPENSE");
  }

  if (upcomingSearch.trim()) {
    const q = upcomingSearch.toLowerCase();
    combinedUpcoming = combinedUpcoming.filter(
      (e) => e.name.toLowerCase().includes(q) || e.categoryName.toLowerCase().includes(q) || e.note.toLowerCase().includes(q)
    );
  }

  combinedUpcoming.sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const nextPaydayEvent = (incomeEventsQuery.data ?? []).find((e) => e.status === "UPCOMING") ?? null;
  let daysUntilPayday: number | null = null;
  if (nextPaydayEvent) {
    const diffTime = new Date(nextPaydayEvent.expectedDate).getTime() - new Date(todayStr).getTime();
    daysUntilPayday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const fmtAUDate = (dStr: string) => {
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      // ignore
    }
    return dStr;
  };

  const handleBulkDelete = () => {
    const incomeIds = selectedEventKeys.filter((k) => k.startsWith("INCOME-")).map((k) => k.replace("INCOME-", ""));
    const expenseIds = selectedEventKeys.filter((k) => k.startsWith("EXPENSE-")).map((k) => k.replace("EXPENSE-", ""));

    bulkDeleteEventsMutation.mutate({
      incomeEventIds: incomeIds,
      expenseEventIds: expenseIds,
    });
  };

  const confirmPaydayMutation = trpc.confirmPayday.useMutation({
    onSuccess: () => {
      utils.listIncomeEvents.invalidate();
      utils.listCategories.invalidate();
      utils.listTransactions.invalidate();
      utils.getMonthlySummary.invalidate();
    },
  });

  const handleQuickApprovePayday = (eventId: string, amount: string) => {
    confirmPaydayMutation.mutate({
      incomeEventId: eventId,
      actualAmount: amount,
      lines: [],
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      <DashboardHeaderHero
        nextPaydayEvent={nextPaydayEvent}
        daysUntilPayday={daysUntilPayday}
        fmt={fmt}
        fmtAUDate={fmtAUDate}
        onProcessPayday={(id) => setPaydayPreviewEventId(id)}
        onQuickApprovePayday={handleQuickApprovePayday}
      />

      <DashboardMetricsCards summary={summaryQuery.data} fmt={fmt} />

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 flex items-center justify-between bg-zinc-50/50 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-lg font-black text-[#1B2B4B]">Quick Actions</h2>
              <p className="text-xs text-zinc-500 font-semibold">Immediate financial tools and calculators</p>
            </div>
          </div>

          <button
            onClick={handleToggleQuickActions}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-white transition-all"
          >
            {isQuickActionsOpen ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>

        {isQuickActionsOpen && (
          <div className="p-4 sm:p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <QuickExpenseCard
                categories={categories}
                bankAccounts={bankAccountsQuery.data ?? []}
                quickType={quickType}
                setQuickType={setQuickType}
                quickName={quickName}
                setQuickName={setQuickName}
                quickCategoryId={quickCategoryId}
                setQuickCategoryId={setQuickCategoryId}
                quickReceivingAccountId={quickReceivingAccountId}
                setQuickReceivingAccountId={setQuickReceivingAccountId}
                quickAmount={quickAmount}
                setQuickAmount={setQuickAmount}
                quickDate={quickDate}
                setQuickDate={setQuickDate}
                quickNote={quickNote}
                setQuickNote={setQuickNote}
                quickMsg={quickMsg}
                isPending={recordExpenseMutation.isPending || createUpcomingExpenseMut.isPending || createUpcomingIncomeMut.isPending}
                onSubmit={handleQuickExpenseSubmit}
              />

              <BankReconcileCard
                accounts={bankAccountsQuery.data ?? []}
                fmt={fmt}
                onOpenSettings={() => router.push("/dashboard/settings/bank-accounts")}
                onReconcile={(id, balance) => {
                  setReconcilingAccountId(id);
                  setReconcileActualAmount(balance);
                }}
              />

              <div className="flex flex-col gap-4">
                <CanAffordCard
                  canAffordAmount={canAffordAmount}
                  setCanAffordAmount={setCanAffordAmount}
                  canAffordData={canAffordQuery.data}
                  fmt={fmt}
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMoveMoneyOpen(true)}
                    className="p-4 rounded-2xl bg-[#00B4A6] text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-lg">🔄</span>
                    <span>Move Money</span>
                  </button>

                  <div className="grid grid-rows-2 gap-2">
                    <button
                      onClick={() => router.push("/dashboard/categories?health=AMBER")}
                      className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between text-xs font-bold hover:bg-amber-100 transition-colors"
                    >
                      <span>At Risk</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{atRiskCount}</span>
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/categories?health=RED")}
                      className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs font-bold hover:bg-rose-100 transition-colors"
                    >
                      <span>Missed</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">{missedCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <UpcomingEventsList
        events={combinedUpcoming}
        selectedEventKeys={selectedEventKeys}
        setSelectedEventKeys={setSelectedEventKeys}
        upcomingFilter={upcomingFilter}
        setUpcomingFilter={setUpcomingFilter}
        upcomingSearch={upcomingSearch}
        setUpcomingSearch={setUpcomingSearch}
        isPendingDelete={bulkDeleteEventsMutation.isPending}
        onBulkDelete={handleBulkDelete}
        onProcessPayday={(evt) => setUpcomingIncomeToEdit({
          id: evt.id,
          sourceName: evt.name,
          expectedDate: evt.expectedDate,
          expectedAmount: evt.expectedAmount,
          note: evt.note,
          isRecurring: evt.isRecurring,
        })}
        onMarkPaid={(evt) => setUpcomingExpenseToEdit({
          id: evt.id,
          name: evt.name,
          expectedDate: evt.expectedDate,
          expectedAmount: evt.expectedAmount,
          categoryId: evt.categoryId,
          categoryName: evt.categoryName,
          note: evt.note,
          isRecurring: evt.isRecurring,
        })}
        fmt={fmt}
        fmtAUDate={fmtAUDate}
        todayStr={todayStr}
      />

      <PaydayPreviewModal
        isOpen={!!paydayPreviewEventId || !!upcomingIncomeToEdit}
        incomeEventId={paydayPreviewEventId}
        eventToEdit={upcomingIncomeToEdit}
        onClose={() => {
          setPaydayPreviewEventId(null);
          setUpcomingIncomeToEdit(null);
        }}
        onSuccess={() => {
          incomeEventsQuery.refetch();
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      <UpcomingExpenseModal
        isOpen={!!upcomingExpenseToEdit}
        eventToEdit={upcomingExpenseToEdit}
        onClose={() => setUpcomingExpenseToEdit(null)}
        onSuccess={() => {
          expenseEventsQuery.refetch();
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      <MoveMoneyModal
        isOpen={moveMoneyOpen}
        onClose={() => setMoveMoneyOpen(false)}
        onSuccess={() => {
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      <BankReconcileModal
        reconcilingAccountId={reconcilingAccountId}
        onClose={() => setReconcilingAccountId(null)}
        reconcileActualAmount={reconcileActualAmount}
        setReconcileActualAmount={setReconcileActualAmount}
        reconcileTargetCategoryId={reconcileTargetCategoryId}
        setReconcileTargetCategoryId={setReconcileTargetCategoryId}
        categories={categories}
        isPending={reconcileMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          if (!reconcilingAccountId) return;
          reconcileMutation.mutate({
            accountId: reconcilingAccountId,
            actualBalance: parseFloat(reconcileActualAmount).toFixed(2),
            targetCategoryId: reconcileTargetCategoryId || undefined,
          });
        }}
      />
    </div>
  );
}
