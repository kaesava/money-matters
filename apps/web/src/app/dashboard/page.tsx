"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc";
import { MoveMoneyModal } from "../../components/web/MoveMoneyModal";
import PaydayPreviewModal from "@/components/web/PaydayPreviewModal";

import { DashboardHeroCard } from "./components/DashboardHeroCard";
import { AttentionItemsList, WebAttentionItem } from "./components/AttentionItemsList";

import { QuickExpenseCard } from "@/components/web/dashboard/QuickExpenseCard";
import { BankReconcileCard } from "@/components/web/dashboard/BankReconcileCard";

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

  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const canAffordQuery = trpc.canAfford.useQuery(
    { amount: canAffordAmount },
    { enabled: !!canAffordAmount && parseFloat(canAffordAmount) > 0 }
  );

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
        isOverdue,
        categoryBalance: catBal,
      };
    });

  const handleMarkPaidItem = (item: WebAttentionItem) => {
    markPaidMutation.mutate({ eventId: item.id, actualAmount: item.expectedAmount.toFixed(2), note: `Paid ${item.name}` });
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordExpenseMutation.mutate({
      amount: quickAmount,
      categoryId: quickCategoryId || categories.find((c) => c.type === "EVERYDAY")?.id || categories[0]?.id || "",
      flowType: quickType,
      note: quickName ? `${quickName}${quickNote ? `: ${quickNote}` : ''}` : (quickNote || undefined),
      recordedAt: quickDate,
    });
  };

  const bankAccountsMapped = (bankAccountsQuery.data ?? []).map((acc) => ({
    id: acc.id,
    name: acc.name,
    lastKnownBalance: acc.lastKnownBalance,
    expectedBalance: acc.expectedBalance,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Top Hero Card with Everyday Balance & Can We Afford This Widget */}
      <DashboardHeroCard
        everydayBalance={everydayBalance}
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
      />

      {/* Attention Items */}
      <AttentionItemsList items={attentionItems} onMarkPaid={handleMarkPaidItem} formatAUD={fmt} />

      {/* Permanent (Non-Collapsible) Quick Actions & Financial Tools */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#1B2B4B]">Quick Actions & Financial Tools</h2>
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
            onReconcile={(id) => setReconcilingAccountId(id)}
            fmt={fmt}
          />
        </div>
      </div>

      {/* Modals */}
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
