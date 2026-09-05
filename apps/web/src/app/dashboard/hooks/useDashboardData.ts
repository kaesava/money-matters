"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";

import { getTenantDateString } from "@money-matters/core";

export function useDashboardData() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const todayStr = getTenantDateString(new Date());

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
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
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
      poolsQuery.refetch();
      summaryQuery.refetch();
      posthog.capture("bank_account_reconciled");
    },
  });

  useEffect(() => {
    const isSkippedOrCompleted =
      Boolean(userPrefQuery.data?.setupCompleted) ||
      (typeof window !== "undefined" && localStorage.getItem("skip_setup_wizard") === "true");

    if (
      poolsQuery.isSuccess &&
      poolsQuery.data &&
      poolsQuery.data.length === 0 &&
      !isSkippedOrCompleted
    ) {
      router.push("/setup");
    }
  }, [poolsQuery.isSuccess, poolsQuery.data, userPrefQuery.data, router]);

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: (_, variables) => {
      utils.listTransactions.invalidate();
      poolsQuery.refetch();
      summaryQuery.refetch();
      setQuickName("");
      setQuickAmount("");
      setQuickNote("");
      setQuickMsg(variables.flowType === "CREDIT" ? "Income recorded successfully!" : "Expense recorded successfully!");
      setTimeout(() => setQuickMsg(null), 3000);
    },
  });

  const markPaidMutation = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      poolsQuery.refetch();
      summaryQuery.refetch();
    },
  });

  const overrideEventMutation = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      incomeEventsQuery.refetch();
      poolsQuery.refetch();
    },
  });

  return {
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
    categoriesQuery: poolsQuery,
    poolsQuery,
    bankAccountsQuery,
    incomeEventsQuery,
    expenseEventsQuery,
    canAffordQuery,
    reconcileMutation,
    recordExpenseMutation,
    markPaidMutation,
    skipUpcomingExpenseMutation: overrideEventMutation,
    updateUpcomingExpenseMutation: overrideEventMutation,
  };
}
