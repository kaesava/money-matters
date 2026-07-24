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

// Strictly define the expected runtime data structure 
// since the backend tRPC router lacks a defined .output() schema
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
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: incomeEventId! },
    { enabled: !!incomeEventId && isOpen }
  );

  // Apply the strict structural interface to the untyped tRPC response
  const previewData = previewQuery.data as PaydayPreviewData | undefined;

  const confirmPaydayMut = trpc.confirmPayday.useMutation();

  useEffect(() => {
    if (previewData) {
      setActualAmount(previewData.incomeEvent.actualAmount);
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

  const handleConfirm = async () => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
        bucketId,
        amount: (parseFloat(amount) || 0).toFixed(2),
      }));

      await confirmPaydayMut.mutateAsync({
        incomeEventId,
        actualAmount: numericActual.toFixed(2),
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
    } catch (e) {}
    return dStr;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="🎉 Process Payday Split"
      subtitle="Review and customize line-by-line distribution across your budget categories"
      isDirty={false}
      onSave={handleConfirm}
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
            {errorMsg && (
              <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Paycheck Summary Header */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Payday Date: {fmtDate(previewData?.incomeEvent.expectedDate || "")}
                </span>
                <h4 className="text-sm font-black text-[#1B2B4B]">Total Paycheck Received</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="w-28 px-3 py-1.5 text-sm font-black rounded-xl border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>
            </div>

            {/* Line-by-Line Breakdown Table */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Budget Allocations Breakdown
              </span>

              {lines.map((line: PaydayLine) => {
                const currentVal = linesMap[line.bucketId] ?? line.proposedAmount.toFixed(2);
                return (
                  <div
                    key={line.bucketId}
                    className="p-3 rounded-xl border border-zinc-100 bg-white flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1B2B4B] truncate">
                          {line.bucketName}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-semibold truncate">
                        {line.reasoning}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-zinc-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={currentVal}
                        onChange={(e) =>
                          setLinesMap((prev) => ({ ...prev, [line.bucketId]: e.target.value }))
                        }
                        className="w-24 px-2 py-1 text-xs font-black rounded-lg border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                      />
                    </div>
                  </div>
                );
              })}
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
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className="px-5 py-2 text-xs font-black rounded-xl bg-[#00B4A6] hover:bg-[#009b8f] text-white shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm & Distribute Payday"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
}
