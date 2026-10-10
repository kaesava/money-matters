"use client";

import { useState } from "react";
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

  const summaryQuery = trpc.getMonthlySummary.useQuery({ year: todayYear, month: todayMonth });
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();

  const reconcileMutation = trpc.reconcileBankBalance.useMutation({
    onSuccess: () => {
      bankAccountsQuery.refetch();
      poolsQuery.refetch();
      summaryQuery.refetch();
      posthog.capture("bank_account_reconciled");
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

  const deleteTransferEventMutation = trpc.deleteTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
    },
  });

  const executeTransferEventMutation = trpc.executeTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
      poolsQuery.refetch();
      utils.listTransactions.invalidate();
    },
  });

  const updateTransferEventMutation = trpc.updateTransferEvent.useMutation({
    onSuccess: () => {
      transferEventsQuery.refetch();
    },
  });

  const markExpensePaidMutation = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      poolsQuery.refetch();
      utils.listTransactions.invalidate();
    },
  });

  const deleteExpenseEventMutation = trpc.deleteExpenseEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
    },
  });

  const deleteIncomeEventMutation = trpc.deleteIncomeEvent.useMutation({
    onSuccess: () => {
      incomeEventsQuery.refetch();
    },
  });

  return {
    router,
    todayStr,
    moveMoneyOpen,
    setMoveMoneyOpen,
    paydayPreviewEventId,
    setPaydayPreviewEventId,
    summaryQuery,
    categoriesQuery: poolsQuery,
    poolsQuery,
    bankAccountsQuery,
    incomeEventsQuery,
    expenseEventsQuery,
    transferEventsQuery,
    reconcileMutation,
    markPaidMutation,
    markExpensePaidMutation,
    deleteExpenseEventMutation,
    deleteIncomeEventMutation,
    deleteTransferEventMutation,
    executeTransferEventMutation,
    updateTransferEventMutation,
    skipUpcomingExpenseMutation: overrideEventMutation,
    updateUpcomingExpenseMutation: overrideEventMutation,
  };
}
