"use client";

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";
import { SeriesNoticeBanner } from "./upcoming/SeriesNoticeBanner";
import { PaydayReasonModal } from "./upcoming/PaydayReasonModal";
import { PaydayLineRow } from "./upcoming/PaydayLineRow";

export interface UpcomingIncomeItem {
  id?: string;
  sourceName?: string;
  expectedDate?: string;
  expectedAmount?: string;
  receivingAccountId?: string | null;
  note?: string | null;
  isRecurring?: boolean;
}

interface PaydayPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeEventId?: string | null;
  eventToEdit?: UpcomingIncomeItem | null;
  isQuickAdd?: boolean;
  onSuccess?: () => void;
}

interface PaydayLine {
  bucketId: string;
  bucketName: string;
  reasoning: string;
  proposedAmount: number;
}

export default function PaydayPreviewModal({
  isOpen,
  onClose,
  incomeEventId,
  eventToEdit,
  isQuickAdd = false,
  onSuccess,
}: PaydayPreviewModalProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeEventId = incomeEventId || eventToEdit?.id || null;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: isOpen });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const [sourceName, setSourceName] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [note, setNote] = useState("");
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [reasonModal, setReasonModal] = useState<{ open: boolean; cat: string; reason: string }>({
    open: false,
    cat: "",
    reason: "",
  });

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeEventId! },
    { enabled: !!activeEventId && isOpen }
  );

  const previewData = previewQuery.data as { incomeEvent: { name?: string; actualAmount?: string; expectedDate?: string }; engineResult: { lines: PaydayLine[] } } | undefined;
  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideMut = trpc.overrideEvent.useMutation();
  const deleteMut = trpc.deleteUpcomingEvent.useMutation();
  const createUpcomingMut = trpc.createUpcomingIncome.useMutation();

  useEffect(() => {
    const currentTodayStr = new Date().toISOString().slice(0, 10);
    if (previewData) {
      setSourceName(previewData.incomeEvent?.name || eventToEdit?.sourceName || "Paycheck");
      setActualAmount(previewData.incomeEvent.actualAmount || eventToEdit?.expectedAmount || "0.00");
      const rawDate = previewData.incomeEvent.expectedDate || eventToEdit?.expectedDate;
      setSelectedDate(rawDate ? new Date(rawDate).toISOString().slice(0, 10) : currentTodayStr);
      setNote(eventToEdit?.note || "");
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || "");

      const initial: Record<string, string> = {};
      for (const line of previewData.engineResult.lines) {
        initial[line.bucketId] = line.proposedAmount.toFixed(2);
      }
      setLinesMap(initial);
    } else {
      setSourceName(eventToEdit?.sourceName || "");
      setActualAmount(eventToEdit?.expectedAmount || "");
      setSelectedDate(eventToEdit?.expectedDate || currentTodayStr);
      setNote(eventToEdit?.note || "");
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || "");
    }
  }, [previewData, eventToEdit, isOpen, bankAccounts]);

  if (!isOpen) return null;

  const lines = previewData?.engineResult.lines || [];
  const totalAllocated = Object.values(linesMap).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const numericActual = parseFloat(actualAmount) || 0;
  const isFutureDate = selectedDate > todayStr;

  const validateInput = (): boolean => {
    if (!sourceName.trim()) {
      setErrorMsg("Please enter an income source name.");
      return false;
    }
    if (isNaN(numericActual) || numericActual < 0) {
      setErrorMsg("Income amount cannot be less than 0.");
      return false;
    }
    return true;
  };

  const handleSaveWithoutMarkingPaid = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeEventId) {
        await overrideMut.mutateAsync({
          eventId: activeEventId,
          eventType: "INCOME",
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          note,
        });
      } else {
        await createUpcomingMut.mutateAsync({
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
      }
      await utils.listIncomeEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save upcoming income event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayday = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeEventId) {
        const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
          bucketId,
          amount: (parseFloat(amount) || 0).toFixed(2),
        }));

        await confirmPaydayMut.mutateAsync({
          incomeEventId: activeEventId,
          actualAmount: totalAllocated.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      } else {
        const createdEvt = await createUpcomingMut.mutateAsync({
          name: sourceName,
          amount: numericActual.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
        const preview = await utils.previewPayday.fetch({ incomeEventId: createdEvt.id });
        const payloadLines = preview.engineResult.lines.map((l: PaydayLine) => ({
          bucketId: l.bucketId,
          amount: l.proposedAmount.toFixed(2),
        }));
        await confirmPaydayMut.mutateAsync({
          incomeEventId: createdEvt.id,
          actualAmount: numericActual.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      }
      await utils.listIncomeEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      await utils.getMonthlySummary.invalidate();
      posthog.capture("payday_confirmed", {
        is_future_payday: isFutureDate,
        distribution_category_count: activeEventId ? lines.length : 0,
        entry_method: activeEventId ? "scheduled_payday" : "quick_record",
      });
      if (onSuccess) onSuccess();
      alert(`🚀 Payday Cascade Complete! $${numericActual.toLocaleString('en-AU', { minimumFractionDigits: 2 })} allocated across household buckets.`);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process payday.");
    } finally {
      setSubmitting(false);
    }

  };

  const handleDelete = async () => {
    if (!activeEventId) return;
    if (!window.confirm("Warning: This upcoming income record will be permanently deleted (not archived). Are you sure?")) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteMut.mutateAsync({
        eventId: activeEventId,
        eventType: "INCOME",
      });
      await utils.listIncomeEvents.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete income record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        title={isQuickAdd ? "Quick Record Income" : `Process Payday / Edit: ${sourceName || "Paycheck"}`}
        subtitle="Review income deposit details, custom splits, or save for payday"
        isDirty={false}
        onSave={handleSaveWithoutMarkingPaid}
      >
        <div className="flex flex-col gap-4 text-zinc-900">
          {errorMsg && (
            <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {!isQuickAdd && (eventToEdit?.isRecurring || previewData?.incomeEvent) && (
            <SeriesNoticeBanner eventType="INCOME" eventName={sourceName} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Income Source Name
              </label>
              <input
                type="text"
                placeholder="e.g. Salary, Client Payment"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Receiving Bank Account
              </label>
              <select
                value={receivingAccountId}
                onChange={(e) => setReceivingAccountId(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
              >
                <option value="">Default Account</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Payday Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Total Income Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
              Notes / Description
            </label>
            <textarea
              rows={2}
              placeholder="Add optional income notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          {lines.length > 0 && (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Payday Category Distribution Split
              </span>
              {lines.map((line) => {
                const cat = categories.find((c) => c.id === line.bucketId);
                const curBal = cat ? parseFloat(cat.currentBalance || "0") : 0;
                return (
                  <PaydayLineRow
                    key={line.bucketId}
                    bucketId={line.bucketId}
                    bucketName={line.bucketName}
                    reasoning={line.reasoning}
                    amountVal={linesMap[line.bucketId] ?? line.proposedAmount.toFixed(2)}
                    onAmountChange={(val) => setLinesMap((prev) => ({ ...prev, [line.bucketId]: val }))}
                    onShowReasoning={(name, reason) => setReasonModal({ open: true, cat: name, reason })}
                    categoryBalance={curBal}
                    healthStatus={cat?.healthStatus}
                    isFutureDate={isFutureDate}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            {!isQuickAdd && activeEventId ? (
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
                Save Details Only (Without Distributing Pay)
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmPayday}
                className="px-4 py-2 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting && <Spinner size="sm" />}
                {isFutureDate
                  ? "📅 Save Plan for Payday"
                  : "Confirm & Distribute Payday"}
              </button>
            </div>
          </div>
        </div>
      </ModalDialog>

      <PaydayReasonModal
        isOpen={reasonModal.open}
        onClose={() => setReasonModal({ open: false, cat: "", reason: "" })}
        categoryName={reasonModal.cat}
        reasoning={reasonModal.reason}
      />
    </>
  );
}
