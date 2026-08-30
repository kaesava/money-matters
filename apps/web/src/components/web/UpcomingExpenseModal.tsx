"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, Spinner } from "@money-matters/ui/web";

import { ModalDialog } from "./ModalDialog";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

interface UpcomingExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: {
    id?: string;
    name?: string;
    poolId?: string;
    categoryId?: string;
    expectedAmount?: string;
    expectedDate?: string;
    note?: string;
  } | null;
  onSuccess?: () => void;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function UpcomingExpenseModal({
  isOpen,
  onClose,
  eventToEdit,
  onSuccess,
}: UpcomingExpenseModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

  const [name, setName] = useState("");
  const [poolId, setPoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState(todayStr);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overrideMut = trpc.overrideEvent.useMutation();
  const markPaidMut = trpc.overrideEvent.useMutation();
  const createExpenseSourceMut = trpc.createExpenseSource.useMutation();
  const recordExpenseMut = trpc.recordExpense.useMutation();

  useEffect(() => {
    const currentTodayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    if (eventToEdit) {
      setName(eventToEdit.name || "");
      setPoolId(eventToEdit.poolId || eventToEdit.categoryId || pools[0]?.id || "");
      setAmount(eventToEdit.expectedAmount || "");
      setExpectedDate(eventToEdit.expectedDate || currentTodayStr);
      setNote(eventToEdit.note || "");
    } else {
      setName("");
      setPoolId(pools[0]?.id || "");
      setAmount("");
      setExpectedDate(currentTodayStr);
      setNote("");
    }
    setErrorMsg("");
  }, [eventToEdit, isOpen, pools]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isFutureDate = expectedDate > todayStr;
  const selectedPool = pools.find((p) => p.id === poolId);
  const currentPoolBalance = selectedPool ? parseFloat(String(selectedPool.currentBalance || "0")) : 0;
  const isNegativeWarning = !isFutureDate && selectedPool && numAmount > currentPoolBalance;

  const handleSaveUpcoming = async () => {
    if (!name.trim()) {
      setErrorMsg("Expense name is required.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: "EXPENSE",
          name,
          amount: numAmount.toFixed(2),
          expectedDate,
          note,
        });
      } else {
        await createExpenseSourceMut.mutateAsync({
          name,
          amount: numAmount.toFixed(2),
          poolId: poolId || pools[0]?.id || "",
          startDate: expectedDate,
          isRecurring: false,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      toast.success(t("toasts.saved"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save upcoming expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!name.trim()) {
      setErrorMsg("Expense name is required.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    if (isNegativeWarning && selectedPool) {
      const confirmMsg = `Warning: Payment of ${fmt(numAmount)} exceeds "${selectedPool.name}" pool balance (${fmt(
        currentPoolBalance
      )}). Proceed?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await markPaidMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: "EXPENSE",
          status: "PAID",
          actualAmount: numAmount.toFixed(2),
          note: note || `Paid ${name}`,
        });
      } else {
        await recordExpenseMut.mutateAsync({
          poolId: poolId || pools[0]?.id || "",
          amount: numAmount.toFixed(2),
          flowType: "DEBIT",
          note: note || `Paid ${name}`,
          recordedAt: expectedDate,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listTransactions.invalidate();
      toast.success(t("toasts.saved"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to mark expense paid.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit?.id ? `Manage Bill — ${eventToEdit.name}` : "Schedule Upcoming Bill"}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Bill / Merchant Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Energy Australia, Netflix, Gym"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.incomeExpenseForm.assignPool", { defaultValue: "Assign to Pool" })}</label>
          <select
            value={poolId}
            onChange={(e) => setPoolId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.poolType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.upcomingExpense.dueDate", { defaultValue: "Due Date" })}</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reference or memo"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={handleSaveUpcoming}
            disabled={submitting}
            className="px-4 py-2 border border-[#2563eb] text-[#2563eb] font-bold rounded-xl hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner size="sm" />
                <span>{t("common.saving")}</span>
              </>
            ) : (
              <span>{t("modals.upcomingExpense.saveUpcoming", { defaultValue: "Save Upcoming" })}</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={submitting}
            className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>{t("common.saving")}</span>
              </>
            ) : (
              <span>{t("actions.markPaid", { defaultValue: "Mark Paid" })}</span>
            )}
          </button>

        </div>
      </div>

    </ModalDialog>
  );
}
