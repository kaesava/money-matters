"use client";

import { useMemo, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import type { IncomeSourceToEdit } from "../../../../components/web/IncomeFormModal";

export interface EnvelopeToEditDraft {
  id: string;
  name: string;
  bankAccountId?: string | null;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | null;
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
  envelopeType?: string;
  poolType?: string;
  type?: string;
  fundingMode?: "RECURRING" | "TARGET_BALANCE";
  isPriority?: boolean;
  hasScheduledEvents?: boolean | null;
}

interface UseIncomeAndBillsDataProps {
  editIncomeId: string | null;
  editBillId: string | null;
  setIncomeToEdit: (src: IncomeSourceToEdit | undefined) => void;
  setIsIncomeModalOpen: (open: boolean) => void;
  setEnvelopeToEdit: (env: EnvelopeToEditDraft | null) => void;
  setIsEnvelopeModalOpen: (open: boolean) => void;
}

/**
 * Fetches and shapes data for the Income & Bills dashboard page, including deep-link edit hydration.
 */
export function usePlanData({
  editIncomeId,
  editBillId,
  setIncomeToEdit,
  setIsIncomeModalOpen,
  setEnvelopeToEdit,
  setIsEnvelopeModalOpen,
}: UseIncomeAndBillsDataProps) {
  const poolsQuery = trpc.listEnvelopes.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const billSchedulesQuery = trpc.listBillSchedules.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    billSchedulesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading ||
    transferEventsQuery.isLoading;

  const pools = useMemo(() => poolsQuery.data || [], [poolsQuery.data]);
  const bankAccounts = useMemo(() => bankAccountsQuery.data || [], [bankAccountsQuery.data]);
  const incomeSources = useMemo(() => incomeSourcesQuery.data || [], [incomeSourcesQuery.data]);
  const billSchedules = useMemo(() => billSchedulesQuery.data || [], [billSchedulesQuery.data]);
  const incomeEvents = useMemo(() => incomeEventsQuery.data || [], [incomeEventsQuery.data]);
  const expenseEvents = useMemo(() => expenseEventsQuery.data || [], [expenseEventsQuery.data]);
  const transferEvents = useMemo(() => transferEventsQuery.data || [], [transferEventsQuery.data]);

  useEffect(() => {
    if (editIncomeId && incomeSources.length > 0) {
      const src = incomeSources.find((s) => s.id === editIncomeId);
      if (src) {
        setIncomeToEdit({ ...src, receivingAccountId: src.receivingAccountId || undefined });
        setIsIncomeModalOpen(true);
      }
    }
  }, [editIncomeId, incomeSources, setIncomeToEdit, setIsIncomeModalOpen]);

  useEffect(() => {
    if (editBillId && (billSchedules.length > 0 || pools.length > 0)) {
      const cat = billSchedules.find((b) => b.id === editBillId || b.envelopeId === editBillId);
      const targetPool = pools.find((p) => p.id === editBillId || (cat && p.id === cat.envelopeId));
      if (cat || targetPool) {
        setEnvelopeToEdit({
          id: targetPool?.id || cat?.envelopeId || cat?.id || editBillId,
          name: targetPool?.name || cat?.envelopeName || cat?.name || "",
          bankAccountId: targetPool?.bankAccountId,
          monthlyAmount: targetPool?.monthlyAmount || cat?.amount,
          enteredAmount: targetPool?.enteredAmount || cat?.amount,
          budgetFrequency: (cat?.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || targetPool?.budgetFrequency || "MONTHLY",
          startDate: cat?.startDate || targetPool?.startDate,
          endDate: cat?.endDate || targetPool?.endDate,
          rrule: cat?.rrule || targetPool?.rrule,
          envelopeType: targetPool?.envelopeType || "BILL",
          fundingMode: targetPool?.fundingMode || "RECURRING",
          isPriority: targetPool?.isPriority ?? cat?.isPriority ?? false,
          hasScheduledEvents: cat?.hasScheduledEvents ?? targetPool?.hasScheduledEvents,
        });
        setIsEnvelopeModalOpen(true);
      }
    }
  }, [editBillId, billSchedules, pools, setEnvelopeToEdit, setIsEnvelopeModalOpen]);

  const savedIncomeEventIds = useMemo(() => {
    const set = new Set<string>();
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.status !== "CONFIRMED") set.add(plan.incomeEventId);
      }
    }
    return set;
  }, [allPlansQuery.data]);

  const matrixIncomeEvents = useMemo(
    () =>
      incomeEvents
        .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
        .map((e) => {
          const receivingAccountId = (e as unknown as { receivingAccountId?: string }).receivingAccountId;
          const acct = bankAccounts.find((b) => b.id === receivingAccountId);
          return {
            id: e.id,
            expectedDate: e.expectedDate,
            expectedAmount: parseFloat(e.expectedAmount || "0"),
            actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
            status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
            sourceName: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Paycheck",
            isPrivate: acct?.isPrivate || false,
          };
        }),
    [incomeEvents, bankAccounts]
  );

  const matrixExpenseEvents = useMemo(
    () =>
      expenseEvents
        .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
        .map((e) => ({
          categoryId: e.envelopeId || "",
          amount: parseFloat(e.expectedAmount || "0"),
          dueDate: e.expectedDate,
          status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
        })),
    [expenseEvents]
  );

  const matrixCategories = useMemo(
    () =>
      pools.map((p) => {
        const typeStr = p.envelopeType === "EVERYDAY" ? "EVERYDAY" : p.envelopeType === "GOAL" ? "GOAL" : "BILL";
        const monthlyAmt = p.monthlyAmount ? parseFloat(p.monthlyAmount) : p.targetAmount ? parseFloat(p.targetAmount) : null;
        return {
          id: p.id,
          name: p.name,
          type: typeStr as "BILL" | "GOAL" | "EVERYDAY",
          currentBalance: parseFloat(String(p.currentBalance || "0")),
          monthlyAmount: monthlyAmt,
          targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
          isPriority: p.isPriority ?? undefined,
          isSurplusTarget: p.isSurplusTarget ?? undefined,
          isPrivate: p.isPrivate ?? undefined,
          endDate: p.endDate || null,
        };
      }),
    [pools]
  );

  return {
    isLoading,
    pools,
    bankAccounts,
    incomeSources,
    billSchedules,
    incomeEvents,
    expenseEvents,
    transferEvents,
    savedIncomeEventIds,
    matrixIncomeEvents,
    matrixExpenseEvents,
    matrixCategories,
  };
}
