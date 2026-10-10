"use client";

import React from "react";
import { UpcomingTimelineTab, TimelineEventItem } from "./UpcomingTimelineTab";
import { trpc } from "../../../../lib/trpc";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useRouter } from "next/navigation";

interface TimelineTabWrapperProps {
  isLoading: boolean;
  savedIncomeEventIds: Set<string>;
  incomeEvents: TimelineEventItem[];
  expenseEvents: TimelineEventItem[];
  transferEvents: TimelineEventItem[];
  categories: Array<{ id: string; name: string; poolId?: string; currentBalance: string | number }>;
  pools: Array<{ id: string; name: string; currentBalance: string | number; bankAccountId?: string | null }>;
  onOpenTransferDrawer: () => void;
}

export function TimelineTabWrapper({
  isLoading,
  savedIncomeEventIds,
  incomeEvents,
  expenseEvents,
  transferEvents,
  categories,
  pools,
  onOpenTransferDrawer,
}: TimelineTabWrapperProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();

  const markExpensePaidMut = trpc.markExpensePaid.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();
  const deleteExpenseMut = trpc.deleteExpenseEvent.useMutation();
  const deleteTransferEventMut = trpc.deleteTransferEvent.useMutation();
  const updateTransferEventMut = trpc.updateTransferEvent.useMutation();
  const executeTransferEventMut = trpc.executeTransferEvent.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  return (
    <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <UpcomingTimelineTab
        isLoading={isLoading}
        savedIncomeEventIds={savedIncomeEventIds}
        incomeEvents={incomeEvents}
        expenseEvents={expenseEvents}
        transferEvents={transferEvents}
        categories={categories}
        pools={pools}
        onMarkExpensePaid={async (eventId, amount, date) => {
          try {
            await markExpensePaidMut.mutateAsync({
              eventId,
              amount: amount ? String(amount) : undefined,
              date: date || undefined,
              note: `Paid on ${date}`,
            });
            toast.success(t("toasts.expenseMarkedPaid"));
            await utils.listExpenseEvents.invalidate();
            await utils.listPools.invalidate();
            await utils.listTransactions.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to mark spent.");
            throw err;
          }
        }}
        onAllocateIncome={(eventId) => {
          router.push(`/dashboard/income-split?id=${eventId}&returnTo=/dashboard/income-and-bills`);
        }}
        onSkipExpense={async (eventId) => {
          try {
            await deleteExpenseMut.mutateAsync({ eventId });
            toast.success(t("toasts.expenseDeleted"));
            utils.listExpenseEvents.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete.");
          }
        }}
        onSkipIncome={async (eventId) => {
          try {
            await deleteIncomeMut.mutateAsync({ eventId });
            toast.success(t("toasts.deleted"));
            utils.listIncomeEvents.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete.");
          }
        }}
        onSkipTransfer={async (eventId) => {
          try {
            await deleteTransferEventMut.mutateAsync({ eventId });
            toast.success(t("toasts.transferDeleted"));
            utils.listTransferEvents.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete.");
          }
        }}
        onSaveTransferDraft={async (params) => {
          try {
            await updateTransferEventMut.mutateAsync({
              eventId: params.eventId,
              name: params.name,
              amount: params.amount,
              expectedDate: params.expectedDate,
            });
            toast.success(t("toasts.transferSaved"));
            utils.listTransferEvents.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save transfer.");
          }
        }}
        onExecuteTransfer={async (eventId, amount, name, sourcePoolId, destinationPoolId) => {
          try {
            await executeTransferEventMut.mutateAsync({ eventId, amount, name, sourcePoolId, destinationPoolId });
            toast.success(t("toasts.transferCompleted"));
            utils.listTransferEvents.invalidate();
            utils.listPools.invalidate();
            utils.listTransactions.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to execute transfer.");
          }
        }}
        onOpenTransferModalWithData={onOpenTransferDrawer}
        onConfirmTransferAndPay={async (transfers, destinationCategoryId) => {
          if (!destinationCategoryId) throw new Error("Invalid target pool for transfer.");
          const validTransfers = transfers.filter((t) => parseFloat(t.amount) > 0);
          if (validTransfers.length === 0) return;
          try {
            await Promise.all(
              validTransfers.map((t) =>
                moveMoneyMut.mutateAsync({
                  sourcePoolId: t.poolId,
                  destinationPoolId: destinationCategoryId,
                  amount: t.amount,
                  note: "Shortfall Top Up",
                })
              )
            );
            await utils.listPools.invalidate();
            await utils.listTransactions.invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to execute transfers.");
            throw err;
          }
        }}
      />
    </div>
  );
}
