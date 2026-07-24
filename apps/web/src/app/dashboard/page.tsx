"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { MoveMoneyModal } from "../../components/web/MoveMoneyModal";
import { DashboardError } from "../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";
import EventOverrideModal from "@/components/web/EventOverrideModal";

export default function DashboardPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;

  // Preferences & State
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateUserPrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => userPrefQuery.refetch(),
  });

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
  const [moveMoneyOpen, setMoveMoneyOpen] = useState(false);

  // Payday & Override Modal States
  const [paydayPreviewEventId, setPaydayPreviewEventId] = useState<string | null>(null);
  
  // Natively infer the exact prop type required by the EventOverrideModal
  const [eventToOverride, setEventToOverride] = useState<React.ComponentProps<typeof EventOverrideModal>["eventToEdit"]>(null);
  const [selectedEventKeys, setSelectedEventKeys] = useState<string[]>([]);

  // Quick Expense Form
  const [quickCategoryId, setQuickCategoryId] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split("T")[0]);
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

  // Skip Mutation
  const skipEventsMutation = trpc.skipEvents.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
      expenseEventsQuery.refetch();
      setSelectedEventKeys([]);
    },
  });

  // Mutations
  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => {
      utils.listTransactions.invalidate();
      categoriesQuery.refetch();
      summaryQuery.refetch();
      setQuickAmount("");
      setQuickNote("");
      setQuickMsg("Expense recorded successfully!");
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

  const markPaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      utils.listTransactions.invalidate();
      expenseEventsQuery.refetch();
      categoriesQuery.refetch();
      summaryQuery.refetch();
    },
  });

  useEffect(() => {
    if (userPrefQuery.data) {
      setIsQuickActionsOpen(!userPrefQuery.data.quickActionsCollapsed);
    }
  }, [userPrefQuery.data]);

  // Global Escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoveMoneyOpen(false);
        setEventToOverride(null);
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

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCategoryId || !quickAmount || parseFloat(quickAmount) <= 0) return;

    const targetCat = categories.find((c) => c.id === quickCategoryId);
    if (targetCat) {
      const currentBal = parseFloat(targetCat.currentBalance || "0");
      const expenseAmt = parseFloat(quickAmount);
      if (expenseAmt > currentBal) {
        if (!confirm(`Warning: Recording this expense of ${fmt(expenseAmt)} exceeds "${targetCat.name}" balance (${fmt(currentBal)}). Category balance will become negative (${fmt(currentBal - expenseAmt)}). Do you wish to proceed?`)) {
          return;
        }
      }
    }

    recordExpenseMutation.mutate({
      categoryId: quickCategoryId,
      amount: parseFloat(quickAmount).toFixed(2),
      flowType: "DEBIT",
      note: quickNote || "Quick Expense",
      recordedAt: new Date(quickDate).toISOString(),
    });
  };

  const handleMarkExpensePaid = (evt: { categoryId: string | null; expectedAmount: string; id: string; name: string }) => {
    const cat = categoriesQuery.data?.find((c) => c.id === evt.categoryId);
    const balance = cat ? parseFloat(cat.currentBalance) : 0;
    const amount = parseFloat(evt.expectedAmount);

    if (cat && balance < amount) {
      if (!confirm(`Warning: Payment of ${fmt(amount)} exceeds "${cat.name}" balance (${fmt(balance)}). Category balance will become negative (${fmt(balance - amount)}). Proceed?`)) {
        return;
      }
    }

    markPaidMutation.mutate({
      eventId: evt.id,
      actualAmount: evt.expectedAmount,
      note: `Paid ${evt.name}`,
    });
  };

  const handleAllocateIncome = (evt: { id: string; expectedAmount: string }) => {
    router.push(`/dashboard/paychecks/cascade?eventId=${evt.id}&amount=${evt.expectedAmount}`);
  };

  const categories = categoriesQuery.data ?? [];
  const atRiskCount = categories.filter((c) => c.healthStatus === "AMBER").length;
  const missedCount = categories.filter((c) => c.healthStatus === "RED").length;

  // Combine Income Events & Expense Events into unified Upcoming Events
  const incomeEventsMapped = (incomeEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .map((e) => ({
      id: e.id,
      type: "INCOME" as const,
      name: e.sourceName || "Paycheck Deposit",
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: "Income Allocation",
      categoryId: null,
      note: "Income Deposit",
      isNextPayday: "isNextPayday" in e ? Boolean(e.isNextPayday) : false,
    }));

  const expenseEventsMapped = (expenseEventsQuery.data ?? [])
    .filter((e) => e.status === "UPCOMING")
    .map((e) => ({
      id: e.id,
      type: "EXPENSE" as const,
      name: e.name,
      expectedDate: e.expectedDate,
      expectedAmount: e.expectedAmount,
      categoryName: e.categoryName || "Uncategorized",
      categoryId: e.categoryId,
      note: e.note || "Bill/Expense",
      isNextPayday: false,
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

  const todayStr = new Date().toISOString().split("T")[0];

  // Resolve Next Immediate Payday Event
  const nextPaydayEvent = (incomeEventsQuery.data ?? []).find((e) => e.status === "UPCOMING");
  let daysUntilPayday: number | null = null;
  if (nextPaydayEvent) {
    const diffTime = new Date(nextPaydayEvent.expectedDate).getTime() - new Date(todayStr).getTime();
    daysUntilPayday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const fmtAUDate = (dStr: string) => {
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch (e) {}
    return dStr;
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 🟢 Next Payday Hero Banner */}
      {nextPaydayEvent && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#1B2B4B] to-[#2C426E] text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00B4A6]/20 border border-[#00B4A6]/40 flex items-center justify-center text-2xl flex-shrink-0">
              📅
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#00B4A6]">
                  Next Payday Countdown
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {daysUntilPayday !== null && daysUntilPayday <= 0
                    ? "DUE TODAY!"
                    : `In ${daysUntilPayday} days`}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">
                {nextPaydayEvent.sourceName || "Primary Salary"} — {fmt(nextPaydayEvent.actualAmount || nextPaydayEvent.expectedAmount)} AUD
              </h3>
              <p className="text-xs text-slate-300 font-semibold">
                Scheduled for {fmtAUDate(nextPaydayEvent.expectedDate)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setPaydayPreviewEventId(nextPaydayEvent.id)}
            className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-[#00B4A6] hover:bg-[#009b8f] active:scale-95 transition-all shadow-md flex items-center gap-2 flex-shrink-0"
          >
            <span>Process Payday</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* 4 Summary Stat Chips (Always visible above Quick Actions) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Total Income</span>
          <span className="text-xl font-black text-[#1B2B4B]">{fmt(summaryQuery.data?.totalIncome || "0.00")}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Spent this Month</span>
          <span className="text-xl font-black text-rose-600">{fmt(summaryQuery.data?.totalSpent || "0.00")}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Saved this Month</span>
          <span className="text-xl font-black text-[#00B4A6]">{fmt(summaryQuery.data?.totalSaved || "0.00")}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Everyday Balance</span>
          <span className="text-xl font-black text-[#1B2B4B]">{fmt(summaryQuery.data?.everydayRemaining || "0.00")}</span>
        </div>
      </div>

      {/* Quick Actions Collapsible Section */}
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
            {/* Grid of Action Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Quick Add Expense */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1B2B4B]">Quick Add Expense</h3>
                  <span className="text-xs text-zinc-400">Draw down</span>
                </div>

                {quickMsg && <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">{quickMsg}</div>}

                <form onSubmit={handleQuickExpenseSubmit} className="flex flex-col gap-3">
                  <select
                    value={quickCategoryId}
                    onChange={(e) => setQuickCategoryId(e.target.value)}
                    required
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount ($)"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      required
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                    <input
                      type="date"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      required
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />

                  <button
                    type="submit"
                    disabled={recordExpenseMutation.isPending}
                    className="py-2.5 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    {recordExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                  </button>
                </form>
              </div>

              {/* Card 2: Bank Balances & Reconciliation */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1B2B4B]">Bank Balances & Reconcile</h3>
                  <button
                    onClick={() => router.push("/dashboard/settings/bank-accounts")}
                    className="text-xs font-bold text-[#00B4A6] hover:underline"
                  >
                    Settings ›
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {/* tRPC perfectly infers 'acc' here, no manual types needed */}
                  {(bankAccountsQuery.data ?? []).map((acc) => {
                    const actualNum = parseFloat(acc.lastKnownBalance || "0");
                    const expectedNum = parseFloat(acc.expectedBalance || "0");
                    const isDiff = Math.abs(actualNum - expectedNum) >= 0.01;

                    return (
                      <div key={acc.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#1B2B4B]">{acc.name}</span>
                          <span className="text-[10px] text-zinc-400">Expected: {fmt(expectedNum)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#1B2B4B]">{fmt(actualNum)}</span>
                          <button
                            onClick={() => {
                              setReconcilingAccountId(acc.id);
                              setReconcileActualAmount(acc.lastKnownBalance || "0.00");
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              isDiff ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                            }`}
                          >
                            {isDiff ? "Reconcile!" : "Adjust"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Can We Afford This? + Card 4 & 5 */}
              <div className="flex flex-col gap-4">
                {/* Can We Afford Widget */}
                <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-[#1B2B4B]">Can We Afford This?</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount ($)"
                      value={canAffordAmount}
                      onChange={(e) => setCanAffordAmount(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>

                  {canAffordQuery.data && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold ${
                        canAffordQuery.data.verdict === "YES"
                          ? "bg-emerald-50 text-emerald-800"
                          : canAffordQuery.data.verdict === "YES_WITH_IMPACT"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {canAffordQuery.data.verdict === "YES" && `YES! Available in Everyday (${fmt(canAffordQuery.data.everydayRemaining)} left)`}
                      {canAffordQuery.data.verdict === "YES_WITH_IMPACT" && `YES WITH IMPACT: Dips into savings (${canAffordQuery.data.affectedBucketName})`}
                      {canAffordQuery.data.verdict === "WAIT" && `WAIT: Paycheck due in ${canAffordQuery.data.daysUntilNextPaycheck} days`}
                      {canAffordQuery.data.verdict === "NO" && `NO: Shortfall of ${fmt(canAffordQuery.data.shortfall)}`}
                    </div>
                  )}
                </div>

                {/* Card 4: Move Money Button & Card 5: Category Health Counters */}
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

      {/* Unified Upcoming Events Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#1B2B4B]">Upcoming Events</h2>
            <p className="text-xs text-zinc-500 font-semibold">Scheduled income deposits & upcoming bill payments</p>
          </div>

          {/* Filter Tabs & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {selectedEventKeys.length > 0 && (
              <button
                onClick={() => {
                  const incomeIds = selectedEventKeys
                    .filter((k) => k.startsWith("INCOME-"))
                    .map((k) => k.replace("INCOME-", ""));
                  const expenseIds = selectedEventKeys
                    .filter((k) => k.startsWith("EXPENSE-"))
                    .map((k) => k.replace("EXPENSE-", ""));

                  if (incomeIds.length > 0) {
                    skipEventsMutation.mutate({ eventIds: incomeIds, eventType: "INCOME" });
                  }
                  if (expenseIds.length > 0) {
                    skipEventsMutation.mutate({ eventIds: expenseIds, eventType: "EXPENSE" });
                  }
                }}
                disabled={skipEventsMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-sm hover:bg-amber-600 transition-all"
              >
                Bulk Skip ({selectedEventKeys.length})
              </button>
            )}

            <input
              type="text"
              placeholder="Search upcoming..."
              value={upcomingSearch}
              onChange={(e) => setUpcomingSearch(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />

            <div className="flex bg-zinc-100 p-1 rounded-xl">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUpcomingFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    upcomingFilter === tab ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab === "INCOME" ? "Income & Paychecks" : "Bills & Expenses"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {combinedUpcoming.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-zinc-100 text-center text-xs text-zinc-400">
            No upcoming events found.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {combinedUpcoming.map((evt) => {
              const isOverdue = evt.expectedDate < todayStr;
              const eventKey = `${evt.type}-${evt.id}`;
              const isSelected = selectedEventKeys.includes(eventKey);
              const isNextPayday = evt.isNextPayday;

              return (
                <div
                  key={eventKey}
                  className={`p-4 rounded-2xl bg-white border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isOverdue ? "border-amber-300 bg-amber-50/20" : "border-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEventKeys((prev) => [...prev, eventKey]);
                        } else {
                          setSelectedEventKeys((prev) => prev.filter((k) => k !== eventKey));
                        }
                      }}
                      className="w-4 h-4 rounded-lg border-zinc-300 text-[#00B4A6] focus:ring-[#00B4A6]"
                    />
                    <span className="text-2xl">{evt.type === "INCOME" ? "💵" : "📄"}</span>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#1B2B4B]">{evt.name}</span>
                        {isOverdue && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            ACTION REQUIRED
                          </span>
                        )}
                        {evt.type === "INCOME" && isNextPayday && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00B4A6]/20 text-[#00B4A6] border border-[#00B4A6]/40">
                            NEXT PAYDAY
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            evt.type === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {evt.type}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400">
                        Date: {fmtAUDate(evt.expectedDate)} • Category: {evt.categoryName} • {evt.note}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${evt.type === "INCOME" ? "text-emerald-600" : "text-[#1B2B4B]"}`}>
                      {evt.type === "INCOME" ? "+" : "-"}{fmt(evt.expectedAmount)}
                    </span>

                    <button
                      onClick={() => setEventToOverride({
                        id: evt.id,
                        eventType: evt.type,
                        name: evt.name,
                        expectedDate: evt.expectedDate,
                        expectedAmount: evt.expectedAmount,
                      })}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      title="Edit occurrence or series"
                    >
                      ✏️ Edit
                    </button>

                    {evt.type === "INCOME" ? (
                      isNextPayday ? (
                        <button
                          onClick={() => setPaydayPreviewEventId(evt.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm"
                        >
                          Process Payday
                        </button>
                      ) : (
                        <span className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-400 bg-zinc-100 cursor-not-allowed">
                          Projected
                        </span>
                      )
                    ) : (
                      <button
                        onClick={() => handleMarkExpensePaid(evt)}
                        disabled={markPaidMutation.isPending}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-sm"
                      >
                        Pay Bill
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payday Preview Modal */}
      <PaydayPreviewModal
        isOpen={!!paydayPreviewEventId}
        incomeEventId={paydayPreviewEventId}
        onClose={() => setPaydayPreviewEventId(null)}
        onSuccess={() => {
          incomeEventsQuery.refetch();
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      {/* Event Override Modal */}
      <EventOverrideModal
        isOpen={!!eventToOverride}
        eventToEdit={eventToOverride}
        onClose={() => setEventToOverride(null)}
        onSuccess={() => {
          incomeEventsQuery.refetch();
          expenseEventsQuery.refetch();
        }}
      />

      {/* Shared Move Money Modal */}
      <MoveMoneyModal
        isOpen={moveMoneyOpen}
        onClose={() => setMoveMoneyOpen(false)}
        onSuccess={() => {
          categoriesQuery.refetch();
          summaryQuery.refetch();
        }}
      />

      {/* Reconcile Modal */}
      {reconcilingAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setReconcilingAccountId(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2B4B]">Bank Balance Reconciliation</h2>
              <button onClick={() => setReconcilingAccountId(null)} className="text-zinc-400 font-bold p-1">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reconcileMutation.mutate({
                  accountId: reconcilingAccountId,
                  actualBalance: parseFloat(reconcileActualAmount).toFixed(2),
                  targetCategoryId: reconcileTargetCategoryId || undefined,
                });
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Actual Bank Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={reconcileActualAmount}
                  onChange={(e) => setReconcileActualAmount(e.target.value)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target Category for Surplus (if surplus)</label>
                <select
                  value={reconcileTargetCategoryId}
                  onChange={(e) => setReconcileTargetCategoryId(e.target.value)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                >
                  <option value="">Default Tenant Surplus Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={reconcileMutation.isPending}
                className="py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
              >
                {reconcileMutation.isPending ? "Reconciling..." : "Confirm Reconciliation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
