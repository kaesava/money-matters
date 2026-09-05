"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Spinner, useToast, Button, InfoTooltip, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

export interface PaydayActionDrawerProps {
  incomeEventId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
}: PaydayActionDrawerProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const activeEventId = incomeEventId;
  const [actualAmount, setActualAmount] = useState<string>("0.00");
  const [sourceName, setSourceName] = useState<string>("Paycheck");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date())
  );

  // Collapsible Income Details section - collapsed by default
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
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
  const revertAllocationPlanMut = trpc.revertAllocationPlan.useMutation();

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || "Paycheck");
      setActualAmount(evt.actualAmount || evt.expectedAmount);
      setSelectedDate(evt.expectedDate);

      const rawLines = (previewQuery.data.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
      const initMap: Record<string, string> = {};
      rawLines.forEach((l: AllocationLineItem) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
      });
      setLinesMap(initMap);
      const isCustom = (previewQuery.data.engineResult as unknown as { isCustomPlan?: boolean })?.isCustomPlan ?? false;
      setIsManualOverride(isCustom);
    }
  }, [previewQuery.data]);

  const isFutureDate = selectedDate > todayStr;
  
  // Checkbox near save: checked by default if date <= today; disabled and unchecked if date > today
  const [runSplitsChecked, setRunSplitsChecked] = useState<boolean>(!isFutureDate);

  useEffect(() => {
    if (isFutureDate) {
      setRunSplitsChecked(false);
    } else {
      setRunSplitsChecked(true);
    }
  }, [isFutureDate]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    // Strip invalid non-numeric characters, enforce max 12 integer digits and max 2 decimal places
    let cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12);
      cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    if (parts[1] && parts[1].length > 2) {
      cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    setLinesMap((prev) => ({ ...prev, [bucketId]: cleaned }));

    const rawLines = (previewQuery.data?.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
    const original = rawLines.find((l) => l.bucketId === bucketId);
    const numVal = parseFloat(cleaned) || 0;
    if (original && Math.abs(numVal - original.proposedAmount) > 0.001) {
      setIsManualOverride(true);
    }
  };

  const handleRevertToAuto = async () => {
    if (!activeEventId) return;
    try {
      setSubmitting(true);
      await revertAllocationPlanMut.mutateAsync({ incomeEventId: activeEventId });
      const refetched = await previewQuery.refetch();
      if (refetched.data) {
        const rawLines = (refetched.data.engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
        const initMap: Record<string, string> = {};
        rawLines.forEach((l: AllocationLineItem) => {
          initMap[l.bucketId] = l.proposedAmount.toFixed(2);
        });
        setLinesMap(initMap);
      }
      setIsManualOverride(false);
      toast.success(t("paydayDrawer.revertedToAutoSuccess", { defaultValue: "Reverted to Auto waterfall allocation plan." }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revert allocation.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const lines: AllocationLineItem[] = useMemo(() => {
    const engineResult = previewQuery.data?.engineResult;
    return (engineResult as unknown as { lines?: AllocationLineItem[] })?.lines ?? [];
  }, [previewQuery.data]);

  const numericActual = parseFloat(actualAmount) || 0;

  // Identify default Sweep Pool (surplus sweep target or Everyday pool)
  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.poolType === "EVERYDAY") || pools[0];
  }, [pools]);

  // Non-sweep lines allocated sum
  const nonSweepAllocatedSum = useMemo(() => {
    if (!sweepPool) return 0;
    return Object.entries(linesMap).reduce((acc, [bId, valStr]) => {
      if (bId === sweepPool.id) return acc;
      return acc + (parseFloat(valStr) || 0);
    }, 0);
  }, [linesMap, sweepPool]);

  // Sweep Pool unallocated remainder balance
  const sweepPoolRemainder = useMemo(() => {
    return Math.max(-999999, numericActual - nonSweepAllocatedSum);
  }, [numericActual, nonSweepAllocatedSum]);

  const isSweepNegative = sweepPoolRemainder < 0;

  const everydayAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "EVERYDAY")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const regularAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "REGULAR")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === "GOAL")
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  // Group lines by pool type
  const groupedLines = useMemo(() => {
    const groups: Array<{ type: "EVERYDAY" | "REGULAR" | "GOAL"; label: string; items: AllocationLineItem[] }> = [
      { type: "EVERYDAY", label: "Everyday Pools", items: [] },
      { type: "REGULAR", label: "Bills Pools", items: [] },
      { type: "GOAL", label: "Goals", items: [] },
    ];

    for (const l of lines) {
      const p = pools.find((pool) => pool.id === l.bucketId);
      const pType = p?.poolType || "REGULAR";
      if (pType === "EVERYDAY") groups[0].items.push(l);
      else if (pType === "GOAL") groups[2].items.push(l);
      else groups[1].items.push(l);
    }

    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const evt = previewQuery.data.incomeEvent;
    
    if (sourceName !== (evt.name || "Paycheck")) return true;
    if (actualAmount !== (evt.actualAmount || evt.expectedAmount)) return true;
    if (selectedDate !== evt.expectedDate) return true;

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
    if (isNaN(numericActual) || numericActual <= 0) {
      setErrorMsg("Income amount must be a positive number.");
      return false;
    }
    if (isSweepNegative) {
      setErrorMsg("Unallocated remainder (Surplus Pool) cannot be negative. Please adjust pool allocation amounts.");
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

      // Prepare allocation payload lines
      const payloadLines = Object.entries(linesMap).map(([bucketId, amountStr]) => ({
        poolId: bucketId,
        amount: (parseFloat(amountStr) || 0).toFixed(2),
      }));

      // 1. Always update event details if modified
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

      if (runSplitsChecked) {
        // Run Splits & mark Income CONFIRMED
        await confirmPaydayMut.mutateAsync({
          incomeEventId: activeEventId,
          actualAmount: numericActual.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: payloadLines,
        });
        toast.success("Income splits executed and income confirmed!");
      } else {
        // Only save allocation draft if manually overridden or explicitly checked
        if (isManualOverride) {
          await saveBulkAllocationsMut.mutateAsync({
            incomeEventId: activeEventId,
            totalIncomeAmount: numericActual.toFixed(2),
            lines: payloadLines.map((l) => ({ poolId: l.poolId, proposedAmount: l.amount })),
          });
          toast.success("Income allocation plan draft saved.");
        } else {
          toast.success("Split plan retained as Auto waterfall.");
        }
      }

      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process income split.");
    } finally {
      setSubmitting(false);
    }
  };

  const attemptClose = useCallback(() => {
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
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
                  {t("paydayDrawer.title", { defaultValue: "Split Income" })}
                </h2>
                {/* AUTO vs MANUAL Badge & Revert Option */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                      isManualOverride
                        ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200"
                        : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                    }`}
                  >
                    {isManualOverride ? "MANUAL" : "AUTO"}
                    <InfoTooltip
                      title={isManualOverride ? "Manual Override" : "Auto Waterfall"}
                      content={
                        isManualOverride
                          ? "Manual override: Allocation amounts were customized by you and saved to your account."
                          : "Auto-calculated: Allocation amounts were generated automatically from your target pool rules."
                      }
                    />
                  </span>

                  {isManualOverride && (
                    <button
                      type="button"
                      onClick={handleRevertToAuto}
                      disabled={submitting}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{t("paydayDrawer.revertToAuto", { defaultValue: "Revert to Auto" })}</span>
                      <InfoTooltip
                        title={t("paydayDrawer.revertToAuto", { defaultValue: "Revert to Auto" })}
                        content={t("paydayDrawer.revertToAutoTooltip", {
                          defaultValue: "Reverting to Auto will discard your manual allocation edits and recalculate the 5-step waterfall plan automatically.",
                        })}
                      />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                {t("paydayDrawer.subtitle", { defaultValue: "Confirm Income & review Income Splits across Pools" })}
              </p>
            </div>
            <button
              onClick={attemptClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            {previewQuery.isLoading ? (
              <div className="py-12 text-center"><Spinner /></div>
            ) : (
              <div className="space-y-6">
                {/* 1. Review Income Section (Collapsible - Collapsed by default) */}
                <section className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen((prev) => !prev)}
                    className="w-full flex items-center gap-2 text-sm font-extrabold text-[#1B2B4B] dark:text-white text-left cursor-pointer"
                  >
                    <span className="text-zinc-500 font-extrabold text-xs">
                      {isDetailsOpen ? "▼" : "▶"}
                    </span>
                    <span>{t("paydayDrawer.reviewIncome", { defaultValue: "Review Income" })}</span>
                  </button>

                  {isDetailsOpen && (
                    <div className="space-y-4 pt-4 mt-3 border-t border-zinc-200 dark:border-zinc-700/60 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Income Source / Description <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={sourceName}
                          onChange={(e) => setSourceName(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          Income Amount ($) <span className="text-red-500">*</span>
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
                          {t("paydayDrawer.incomeDate", { defaultValue: "Income Date" })}
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* 2. Split Income across Pools Section */}
                <section>
                  <h3 className="text-sm font-extrabold text-[#1B2B4B] dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">2</span>
                    {t("paydayDrawer.splitIncomeAcrossPools", { defaultValue: "Split Income across Pools" })}
                  </h3>

                  {/* Summary Header: Everyday, Bills, Goals */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
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

                  {/* Grouped Pool Allocation Inputs */}
                  <div className="space-y-4">
                    {groupedLines.map((group) => (
                      <div key={group.type} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#1B2B4B] dark:text-blue-300">
                          <span>•</span>
                          <span>{group.label}</span>
                        </div>
                        <div className="space-y-1.5">
                          {group.items.map((l: AllocationLineItem) => {
                            const poolObj = pools.find((p) => p.id === l.bucketId);
                            const currentBal = poolObj ? parseFloat(String(poolObj.currentBalance || "0")) : 0;
                            const targetAmt = poolObj?.targetAmount ? parseFloat(poolObj.targetAmount) : 0;

                            return (
                              <div
                                key={l.bucketId}
                                className="py-2.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex justify-between items-center group hover:border-zinc-300 transition-colors"
                              >
                                <div className="min-w-0 pr-3">
                                  <span className="text-xs font-bold text-[#1B2B4B] dark:text-white block truncate">
                                    {l.bucketName}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono block truncate">
                                    Bal: {fmt(currentBal)} · Target: {fmt(targetAmt)}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2)}
                                  onChange={(e) => handleLineAmountChange(l.bucketId, e.target.value)}
                                  className="w-28 px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 tabular-nums"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            {/* Total Section & Surplus Pool Unallocated Remainder */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
              {sweepPool && (
                <div className="flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  <span className="flex items-center gap-1">
                    <span>🎯 {t("paydayDrawer.surplusPool", { defaultValue: "Surplus Pool" })} ({sweepPool.name}):</span>
                  </span>
                  <span className={`font-mono font-extrabold ${isSweepNegative ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {fmt(sweepPoolRemainder)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white pt-1 border-t border-zinc-200 dark:border-zinc-700/40">
                <span className="uppercase tracking-wider text-[10px] text-zinc-500">{t("paydayDrawer.totalIncomeAmount", { defaultValue: "Total Income Amount" })}</span>
                <span className="font-mono font-black text-sm">{fmt(numericActual)}</span>
              </div>
            </div>

            {/* Checkbox: Run Split to update Pool and Bank Balances and mark CONFIRMED */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="runSplitsCheckbox"
                checked={runSplitsChecked}
                disabled={isFutureDate}
                onChange={(e) => setRunSplitsChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
              />
              <div className="flex-1">
                <label
                  htmlFor="runSplitsCheckbox"
                  className={`text-xs font-bold leading-tight block ${
                    isFutureDate ? "text-zinc-400 cursor-not-allowed" : "text-[#1B2B4B] dark:text-zinc-200 cursor-pointer"
                  }`}
                >
                  {t("paydayDrawer.runSplitsCheckbox", { defaultValue: "Run Split to update Pool and Bank Balances and mark CONFIRMED" })}
                  <InfoTooltip
                    title="Run Income Split"
                    content={t("paydayDrawer.runSplitsTooltip", {
                      defaultValue: "Check to confirm the income was received. This will trigger your Pool balances and Bank balances to get updated and the income to be marked Confirmed. Once confirmed, this action cannot be undone. When unchecked (or for future dated income), your split plan will be saved but not run.",
                    })}
                  />
                </label>
                {isFutureDate && (
                  <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                    {t("paydayDrawer.futureIncomeWarning", { defaultValue: "You cannot run a Split on future income" })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={attemptClose}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs transition-colors cursor-pointer"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <Button
                type="button"
                onClick={handleAction}
                loading={submitting}
                disabled={isSweepNegative || submitting}
                className="px-5 py-2 text-xs shadow-md font-bold cursor-pointer"
              >
                {runSplitsChecked ? t("paydayDrawer.runSplitAndConfirm", { defaultValue: "Run Split & Confirm" }) : t("paydayDrawer.saveAllocationDraft", { defaultValue: "Save Allocation Draft" })}
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
        description="You have unsaved allocation edits. Are you sure you want to discard them?"
        confirmLabel="Discard"
        variant="danger"
      />
    </div>
  );
}

