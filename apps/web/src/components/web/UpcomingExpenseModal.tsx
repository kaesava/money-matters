"use client";

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";
import { ExpenseCategoryInfo } from "./upcoming/ExpenseCategoryInfo";
import { SeriesNoticeBanner } from "./upcoming/SeriesNoticeBanner";

export interface UpcomingExpenseItem {
  id?: string;
  name: string;
  expectedDate: string;
  expectedAmount: string;
  categoryId: string | null;
  categoryName?: string;
  note?: string | null;
  isRecurring?: boolean;
}

interface UpcomingExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: UpcomingExpenseItem | null;
  isQuickAdd?: boolean;
  onSuccess?: () => void;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function UpcomingExpenseModal({
  isOpen,
  onClose,
  eventToEdit,
  isQuickAdd = false,
  onSuccess,
}: UpcomingExpenseModalProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().split("T")[0];

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState(todayStr);
  const [note, setNote] = useState("");
  const [updateSeries, setUpdateSeries] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const overrideMut = trpc.overrideEvent.useMutation();
  const markPaidMut = trpc.markExpensePaid.useMutation();
  const deleteMut = trpc.deleteUpcomingEvent.useMutation();
  const createUpcomingMut = trpc.createUpcomingExpense.useMutation();
  const recordExpenseMut = trpc.recordExpense.useMutation();

  useEffect(() => {
    const currentTodayStr = new Date().toISOString().split("T")[0];
    if (eventToEdit) {
      setName(eventToEdit.name || "");
      setCategoryId(eventToEdit.categoryId || (categories[0]?.id ?? ""));
      setAmount(eventToEdit.expectedAmount || "");
      setExpectedDate(eventToEdit.expectedDate || currentTodayStr);
      setNote(eventToEdit.note || "");
      setUpdateSeries(false);
    } else {
      setName("");
      setCategoryId(categories[0]?.id || "");
      setAmount("");
      setExpectedDate(currentTodayStr);
      setNote("");
    }
    setErrorMsg("");
  }, [eventToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isFutureDate = expectedDate > todayStr;
  const selectedCat = categories.find((c) => c.id === categoryId);
  const currentCatBalance = selectedCat ? parseFloat(selectedCat.currentBalance || "0") : 0;
  const isNegativeWarning = !isFutureDate && selectedCat && numAmount > currentCatBalance;

  const validateInput = (): boolean => {
    if (!name.trim()) {
      setErrorMsg("Please enter an expense bill name.");
      return false;
    }
    if (!categoryId) {
      setErrorMsg("Please select a category.");
      return false;
    }
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg("Amount cannot be less than 0.");
      return false;
    }
    return true;
  };

  const handleSaveWithoutMarkingPaid = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: "EXPENSE",
          name,
          categoryId,
          amount: numAmount.toFixed(2),
          expectedDate,
          note,
          updateSeries,
        });
      } else {
        await createUpcomingMut.mutateAsync({
          name,
          amount: numAmount.toFixed(2),
          categoryId,
          expectedDate,
          note,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listCategories.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save upcoming expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    setErrorMsg("");
    if (!validateInput()) return;

    if (isNegativeWarning) {
      const confirmMsg = `Payment of ${fmt(numAmount)} exceeds "${selectedCat?.name}" balance (${fmt(
        currentCatBalance
      )}). Category balance will become negative (${fmt(currentCatBalance - numAmount)}). Do you wish to proceed?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await markPaidMut.mutateAsync({
          eventId: eventToEdit.id,
          actualAmount: numAmount.toFixed(2),
          note: note || `Paid ${name}`,
        });
      } else {
        await recordExpenseMut.mutateAsync({
          categoryId,
          amount: numAmount.toFixed(2),
          flowType: "DEBIT",
          note: note || `Paid ${name}`,
          recordedAt: new Date(expectedDate).toISOString(),
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      await utils.getMonthlySummary.invalidate();
      posthog.capture("expense_marked_paid", {
        source: eventToEdit?.id ? "upcoming_expense" : "quick_record",
        had_negative_balance_warning: Boolean(isNegativeWarning),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to mark expense as paid.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit?.id) return;
    if (!window.confirm("Warning: This upcoming expense record will be permanently deleted (not archived). Are you sure?")) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteMut.mutateAsync({
        eventId: eventToEdit.id,
        eventType: "EXPENSE",
      });
      await utils.listExpenseEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete expense record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isQuickAdd ? "Quick Record Expense" : `Edit / Mark Paid: ${name || "Expense"}`}
      subtitle="Configure bill details, update dates, or record payment"
      isDirty={false}
      onSave={handleSaveWithoutMarkingPaid}
    >
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 text-zinc-900">
        {errorMsg && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {!isQuickAdd && eventToEdit?.isRecurring && (
          <SeriesNoticeBanner eventType="EXPENSE" eventName={name} />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            Expense Bill Name
          </label>
          <input
            type="text"
            placeholder="e.g. Electricity Bill, Gym Membership"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            Category {isQuickAdd ? "" : "(Read-Only)"}
          </label>
          {isQuickAdd ? (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={selectedCat?.name || eventToEdit?.categoryName || "Uncategorized"}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 cursor-not-allowed"
            />
          )}
        </div>

        {selectedCat && (
          <ExpenseCategoryInfo
            categoryName={selectedCat.name}
            currentBalance={currentCatBalance}
            expenseAmount={numAmount}
            healthStatus={selectedCat.healthStatus}
            isFutureDate={isFutureDate}
          />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            Notes / Description
          </label>
          <textarea
            rows={2}
            placeholder="Add optional notes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        {isFutureDate && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
            Your category balances will only update when money is actually marked as paid. Saving this will store your expense so it&apos;s ready to go when paid (or change the date above if your expense occurred early!).
          </div>
        )}

        {isNegativeWarning && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            ⚠️ Warning: Payment of {fmt(numAmount)} exceeds &quot;{selectedCat.name}&quot; balance ({fmt(currentCatBalance)}). Category balance will become negative ({fmt(currentCatBalance - numAmount)}).
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
          {!isQuickAdd && eventToEdit?.id ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 transition-all disabled:opacity-50"
            >
              🗑️ Delete Record
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSaveWithoutMarkingPaid}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#00B4A6] text-[#00B4A6] hover:bg-teal-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting && <Spinner size="sm" />}
              Save without Marking Paid
            </button>

            <button
              type="button"
              disabled={submitting || isFutureDate}
              onClick={handleMarkPaid}
              className={`px-4 py-2 text-xs font-black rounded-xl text-white transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isFutureDate
                  ? "bg-zinc-300 cursor-not-allowed"
                  : "bg-[#1B2B4B] hover:bg-[#111c33]"
              }`}
              title={isFutureDate ? "Cannot mark future date as paid" : "Mark expense paid"}
            >
              {submitting && <Spinner size="sm" />}
              Mark as Paid
            </button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
