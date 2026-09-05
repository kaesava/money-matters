"use client";

import React, { useState, useEffect } from "react";
import { Spinner, useToast, Button } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { ConfirmDialog } from "@money-matters/ui/web";

export interface PaydayActionDrawerProps {
  incomeEventId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "MARK_RECEIVED" | "ALLOCATE";
}

interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaydayActionDrawer({
  incomeEventId,
  isOpen,
  onClose,
  onSuccess,
  mode,
}: PaydayActionDrawerProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = poolsQuery.data ?? [];

  const activeEventId = incomeEventId;
  const [actualAmount, setActualAmount] = useState<string>("0.00");
  const [sourceName, setSourceName] = useState<string>("Paycheck");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())
  );

  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeEventId || "" },
    { enabled: isOpen && !!activeEventId }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || "Paycheck");
      // Use actualAmount if present, else expectedAmount
      setActualAmount(evt.actualAmount || evt.expectedAmount);
      setSelectedDate(evt.expectedDate);

      const rawLines = (previewQuery.data.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
      const initMap: Record<string, string> = {};
      rawLines.forEach((l: AllocationLineItem) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
      });
      setLinesMap(initMap);
    }
  }, [previewQuery.data]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    setLinesMap((prev) => ({ ...prev, [bucketId]: val }));
  };

  const engineResult = previewQuery.data?.engineResult;
  const lines: AllocationLineItem[] = (engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];

  const totalAllocated = Object.values(linesMap).reduce((acc: number, val: string) => acc + (parseFloat(val) || 0), 0);
  const numericActual = parseFloat(actualAmount) || 0;
  const isFutureDate = selectedDate > todayStr;

  const everydayAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "EVERYDAY")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const regularAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "REGULAR")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalAllocated = lines
    .filter((l: AllocationLineItem) => pools.find((p) => p.id === l.bucketId)?.poolType === "GOAL")
    .reduce((sum: number, l: AllocationLineItem) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const isDirty = React.useMemo(() => {
    if (!previewQuery.data) return false;
    const evt = previewQuery.data.incomeEvent;
    
    // Check if deposit details changed
    if (sourceName !== (evt.name || "Paycheck")) return true;
    if (actualAmount !== (evt.actualAmount || evt.expectedAmount)) return true;
    if (selectedDate !== evt.expectedDate) return true;

    // Check if allocation lines changed
    const rawLines = (previewQuery.data.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
    for (const l of rawLines) {
      if (linesMap[l.bucketId] !== l.proposedAmount.toFixed(2)) return true;
    }

    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap]);

  const validateInput = (): boolean => {
    if (!sourceName.trim()) {
      setErrorMsg("Please enter an income source name.");
      return false;
    }
    if (isNaN(numericActual) || numericActual < 0) {
      setErrorMsg("Income amount cannot be less than 0.");
      return false;
    }
    // Strict sum validation for mark received. For allocation, we still want it to match.
    if (Math.abs(numericActual - totalAllocated) > 0.02) {
      setErrorMsg(`Allocated sum (${fmt(totalAllocated)}) must equal deposit amount (${fmt(numericActual)}).`);
      return false;
    }
    return true;
  };

  const handleAction = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (!activeEventId) throw new Error("No active event ID");

      const payloadLines = Object.entries(linesMap).map(([bucketId, amount]) => ({
        poolId: bucketId,
        amount: (parseFloat(amount) || 0).toFixed(2),
      }));

      if (mode === "MARK_RECEIVED") {
        await confirmPaydayMut.mutateAsync({
          incomeEventId: activeEventId,
          actualAmount: totalAllocated.toFixed(2), // Ensure exactly equal to sum
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
      } else {
        // ALLOCATE mode
        // 1. Update event details if changed
        const evt = previewQuery.data?.incomeEvent;
        if (
          evt &&
          (sourceName !== (evt.name || "Paycheck") ||
            actualAmount !== (evt.actualAmount || evt.expectedAmount) ||
            selectedDate !== evt.expectedDate)
        ) {
          await overrideEventMut.mutateAsync({
            eventId: activeEventId,
            eventType: "INCOME",
            name: sourceName,
            expectedAmount: parseFloat(actualAmount).toFixed(2),
            expectedDate: selectedDate,
          });
        }
        // 2. Save bulk allocations
        await saveBulkAllocationsMut.mutateAsync({
          incomeEventId: activeEventId,
          totalIncomeAmount: totalAllocated.toFixed(2),
          lines: payloadLines.map(l => ({ poolId: l.poolId, proposedAmount: l.amount })),
        });
      }

      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      toast.success(mode === "MARK_RECEIVED" ? t("toasts.saved") : "Allocation draft saved");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process payday action.");
    } finally {
      setSubmitting(false);
    }
  };

  const attemptClose = React.useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // ESC key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showDiscardConfirm) {
        attemptClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDiscardConfirm, attemptClose]);

  if (!isOpen) return null;

  const isAllocate = mode === "ALLOCATE";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={attemptClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
            <div>
              <h2 className="text-xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
                {isAllocate ? "Allocate Upcoming Payday" : "Process Payday Deposit"}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                {isAllocate 
                  ? "Update income details and save allocation draft." 
                  : "Review allocations and confirm income deposit."}
              </p>
            </div>
            <button
              onClick={attemptClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            {previewQuery.isLoading ? (
              <div className="py-12 text-center"><Spinner /></div>
            ) : (
              <div className="space-y-8">
                {/* 1. Deposit Details Section */}
                <section>
                  <h3 className="text-sm font-extrabold text-[#1B2B4B] dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                    {t("modals.paydayPreview.depositDetails", { defaultValue: "Deposit Details" })}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        {t("modals.paydayPreview.incomeLabel", { defaultValue: "Income Source Name" })} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isAllocate ? "Expected Amount ($)" : "Received Amount ($)"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={actualAmount}
                        onChange={(e) => setActualAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        {isAllocate ? "Expected Date" : t("modals.paydayPreview.depositDate", { defaultValue: "Deposit Date" })}
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                {/* 2. Waterfall Split Section */}
                <section>
                  <h3 className="text-sm font-extrabold text-[#1B2B4B] dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">2</span>
                    {t("modals.paydayPreview.waterfallSplit", { defaultValue: "Waterfall Split" })}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 text-center mb-5 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("poolTypes.everyday", { defaultValue: "Everyday" })}</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(everydayAllocated)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("poolTypes.bills", { defaultValue: "Bills" })}</span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{fmt(regularAllocated)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("poolTypes.goals", { defaultValue: "Goals" })}</span>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(goalAllocated)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {lines.map((l: AllocationLineItem) => (
                      <div key={l.bucketId} className="py-2.5 px-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors flex justify-between items-center group">
                        <div className="min-w-0 pr-3">
                          <span className="text-xs font-bold text-[#1B2B4B] dark:text-white block truncate">{l.bucketName}</span>
                          <span className="text-[10px] text-zinc-500 block truncate" title={l.reasoning}>{l.reasoning}</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLineAmountChange(l.bucketId, e.target.value)}
                          className="w-24 px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 group-hover:border-zinc-400 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("modals.paydayPreview.totalAllocated", { defaultValue: "Total Allocated" })}</span>
              <span className={`text-sm font-black font-mono ${Math.abs(numericActual - totalAllocated) > 0.02 ? 'text-red-600' : 'text-[#1B2B4B] dark:text-white'}`}>
                {fmt(totalAllocated)} <span className="text-zinc-400 font-medium text-xs">/ {fmt(numericActual)}</span>
              </span>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={attemptClose}
                className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <Button
                type="button"
                onClick={handleAction}
                loading={submitting}
                disabled={(!isDirty && isAllocate) || submitting} // Require changes to save allocation draft
                className="px-6 py-2.5 text-sm shadow-md"
              >
                {isAllocate ? "Save Allocation" : "Confirm & Deposit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard changes?"
        description="You have unsaved edits. Are you sure you want to discard them?"
        confirmLabel="Discard"
        variant="danger"
      />
    </div>
  );
}
