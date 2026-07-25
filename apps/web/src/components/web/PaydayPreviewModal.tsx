"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";

interface PaydayPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeEventId: string | null;
  onSuccess?: () => void;
}

interface PaydayLine {
  bucketId: string;
  bucketName: string;
  reasoning: string;
  proposedAmount: number;
}

interface PaydayPreviewData {
  incomeEvent: {
    actualAmount: string;
    expectedDate: string;
  };
  engineResult: {
    lines: PaydayLine[];
  };
}

export default function PaydayPreviewModal({
  isOpen,
  onClose,
  incomeEventId,
  onSuccess,
}: PaydayPreviewModalProps) {
  const utils = trpc.useUtils();
  const [actualAmount, setActualAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMismatchWarning, setShowMismatchWarning] = useState(false);

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: incomeEventId! },
    { enabled: !!incomeEventId && isOpen }
  );

  const previewData = previewQuery.data as PaydayPreviewData | undefined;
  const confirmPaydayMut = trpc.confirmPayday.useMutation();

  useEffect(() => {
    if (previewData) {
      setActualAmount(previewData.incomeEvent.actualAmount);
      const rawDate = previewData.incomeEvent.expectedDate;
      const parsedDate = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      setSelectedDate(parsedDate);

      const initial: Record<string, string> = {};
      for (const line of previewData.engineResult.lines) {
        initial[line.bucketId] = line.proposedAmount.toFixed(2);
      }
      setLinesMap(initial);
    }
  }, [previewData]);

  if (!isOpen || !incomeEventId) return null;

  const lines = previewData?.engineResult.lines || [];
  const totalAllocated = Object.values(linesMap).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );
  const numericActual = parseFloat(actualAmount) || 0;
  const unallocated = numericActual - totalAllocated;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isFutureDate = selectedDate > todayStr;

  const handleConfirm = async (overrideMismatch = false) => {
    setErrorMsg("");

    if (!overrideMismatch && Math.abs(numericActual - totalAllocated) >= 0.01) {
      setShowMismatchWarning(true);
      return;
    }

    setSubmitting(true);
    setShowMismatchWarning(false);
    try {
      const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
        bucketId,
        amount: (parseFloat(amount) || 0).toFixed(2),
      }));

      // If user selected today or a past date, mark as received today/posted
      const markAsReceivedToday = !isFutureDate;

      await confirmPaydayMut.mutateAsync({
        incomeEventId,
        actualAmount: totalAllocated.toFixed(2),
        markAsReceivedToday,
        lines: payloadLines,
      });

      await utils.listIncomeEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      await utils.getMonthlySummary.invalidate();

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to confirm payday allocation.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (dStr: string) => {
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      // ignore
    }
    return dStr;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="🎉 Process Payday Split"
      subtitle="Review and customize line-by-line distribution across your budget categories"
      isDirty={false}
      onSave={() => handleConfirm(false)}
    >
      <div className="flex flex-col gap-5 text-zinc-900">
        {previewQuery.isLoading ? (
          <div className="py-8 text-center text-xs font-bold text-zinc-500 animate-pulse">
            Calculating payday allocation waterfall...
          </div>
        ) : previewQuery.isError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {previewQuery.error.message}
          </div>
        ) : (
          <>
            {isFutureDate && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex flex-col gap-1.5 shadow-2xs">
                <span className="font-extrabold text-teal-950 flex items-center gap-1.5 text-sm">
                  <span>📅</span> Upcoming Payday ({fmtDate(selectedDate)})
                </span>
                <p className="text-xs text-teal-800 font-medium leading-relaxed">
                  Your category balances will only update when money actually lands in your bank. Saving this will store your split plan so it&apos;s ready to go on payday (or change the date above if your pay arrived early!).
                </p>
              </div>
            )}

            {showMismatchWarning && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>Paycheck Total Allocation Mismatch</span>
                </div>
                <p className="font-normal text-zinc-700">
                  The sum of your category allocations (${totalAllocated.toFixed(2)} AUD) does not equal the entered paycheck total (${numericActual.toFixed(2)} AUD).
                </p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowMismatchWarning(false)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-zinc-700 font-bold text-xs hover:bg-white"
                  >
                    Adjust Lines
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700"
                  >
                    Proceed with ${totalAllocated.toFixed(2)} AUD
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Paycheck Summary Header */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Payday Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900 bg-white"
                />
              </div>

              <div className="flex flex-col items-end gap-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Total Paycheck Amount
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-28 px-3 py-1 text-sm font-black rounded-xl border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>
              </div>
            </div>

            {/* Line-by-Line Breakdown Table */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {lines.map((line) => (
                <div
                  key={line.bucketId}
                  className="p-3 rounded-xl bg-white border border-zinc-100 flex items-center justify-between shadow-2xs hover:border-zinc-200 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold truncate text-[#1B2B4B]">{line.bucketName}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{line.reasoning}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={linesMap[line.bucketId] ?? line.proposedAmount.toFixed(2)}
                      onChange={(e) =>
                        setLinesMap((prev) => ({
                          ...prev,
                          [line.bucketId]: e.target.value,
                        }))
                      }
                      className="w-24 px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Ticker Bar */}
            <div className="p-3.5 rounded-xl bg-[#1B2B4B] text-white flex items-center justify-between text-xs font-bold">
              <div>
                <span className="text-zinc-400 text-[10px] uppercase font-bold block">Allocated Total</span>
                <span>${totalAllocated.toFixed(2)} AUD</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block">Remaining Unallocated</span>
                <span className={unallocated < 0 ? "text-rose-400" : "text-[#00B4A6]"}>
                  ${unallocated.toFixed(2)} AUD
                </span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
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
                onClick={() => handleConfirm(false)}
                className="px-5 py-2 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white shadow-sm transition-all disabled:opacity-50"
              >
                {submitting
                  ? "Processing..."
                  : isFutureDate
                  ? "📅 Save Plan for Payday"
                  : "Confirm & Distribute Payday"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
}
