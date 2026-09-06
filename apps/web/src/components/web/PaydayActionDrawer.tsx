"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Spinner, useToast, Button, InfoTooltip, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { PaydayTransferCard, PaydayTransferLine } from "./PaydayTransferCard";

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

function extractLinesFromEngineResult(engineResult: unknown): AllocationLineItem[] {
  if (!engineResult) return [];
  let raw: Array<Record<string, unknown>> = [];
  if (Array.isArray(engineResult)) {
    raw = engineResult;
  } else if (typeof engineResult === "object" && engineResult !== null && "lines" in engineResult) {
    raw = Array.isArray((engineResult as { lines?: unknown[] }).lines)
      ? ((engineResult as { lines: Array<Record<string, unknown>> }).lines)
      : [];
  }
  return raw.map((item) => ({
    bucketId: String(item.bucketId || item.poolId || ""),
    bucketName: String(item.bucketName || item.poolName || "Unknown Pool"),
    proposedAmount: typeof item.proposedAmount === "number" ? item.proposedAmount : parseFloat(String(item.proposedAmount || "0")),
    reasoning: String(item.reasoning || ""),
  }));
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

  // Expansion state for Pool Types
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    EVERYDAY: true,
    REGULAR: true,
    GOAL: true,
  });

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Plan state: SAVED = PENDING plan exists, CONFIRMED = executed plan, AUTO = no plan
  const [isSavedPlan, setIsSavedPlan] = useState<boolean>(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState<boolean>(false);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeEventId || "" },
    { enabled: isOpen && !!activeEventId }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const revertAllocationPlanMut = trpc.revertAllocationPlan.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || "Paycheck");
      setActualAmount(evt.actualAmount || evt.expectedAmount);
      setSelectedDate(evt.expectedDate);

      const rawLines = extractLinesFromEngineResult(previewQuery.data.engineResult);
      const initMap: Record<string, string> = {};
      rawLines.forEach((l: AllocationLineItem) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
      });
      setLinesMap(initMap);

      const engineResult = previewQuery.data.engineResult as unknown as { isCustomPlan?: boolean; isConfirmedPlan?: boolean };
      setIsSavedPlan(engineResult?.isCustomPlan ?? false);
      setIsConfirmedPlan(engineResult?.isConfirmedPlan ?? false);
    }
  }, [previewQuery.data]);

  const isFutureDate = selectedDate > todayStr;

  const handleLineAmountChange = (bucketId: string, val: string) => {
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
  };

  const handleRevertToAuto = async () => {
    if (!activeEventId) return;
    try {
      setSubmitting(true);
      await revertAllocationPlanMut.mutateAsync({ incomeEventId: activeEventId });
      await utils.listAllAllocationPlans.invalidate();
      await utils.listIncomeEvents.invalidate();
      await utils.listExpenseEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listTransactions.invalidate();
      const refetched = await previewQuery.refetch();
      if (refetched.data) {
        const rawLines = extractLinesFromEngineResult(refetched.data.engineResult);
        const initMap: Record<string, string> = {};
        rawLines.forEach((l: AllocationLineItem) => {
          initMap[l.bucketId] = l.proposedAmount.toFixed(2);
        });
        setLinesMap(initMap);
      }
      toast.success(t("matrix.revertSuccess", { defaultValue: "Reverted. Income Split will be auto calculated" }));
      setIsSavedPlan(false);
      setIsConfirmedPlan(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revert allocation.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (!activeEventId) return;
    try {
      setSubmitting(true);
      await deleteIncomeMut.mutateAsync({ eventId: activeEventId });
      toast.success("Income deleted.");
      await utils.listIncomeEvents.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete income.");
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const lines: AllocationLineItem[] = useMemo(() => {
    return extractLinesFromEngineResult(previewQuery.data?.engineResult);
  }, [previewQuery.data]);

  const numericActual = parseFloat(actualAmount) || 0;

  const sweepPool = useMemo(() => {
    return pools.find((p) => p.isSurplusTarget) || pools.find((p) => p.poolType === "EVERYDAY") || pools[0];
  }, [pools]);

  const nonSweepAllocatedSum = useMemo(() => {
    if (!sweepPool) return 0;
    return Object.entries(linesMap).reduce((acc, [bId, valStr]) => {
      if (bId === sweepPool.id) return acc;
      return acc + (parseFloat(valStr) || 0);
    }, 0);
  }, [linesMap, sweepPool]);

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

  const transferLines: PaydayTransferLine[] = useMemo(() => {
    return lines
      .map((l) => {
        const poolObj = pools.find((p) => p.id === l.bucketId);
        const amount = parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0;
        return {
          categoryName: l.bucketName,
          categoryType: (poolObj?.poolType || "REGULAR") as "REGULAR" | "GOAL" | "EVERYDAY",
          targetAccountName: poolObj?.name ? `${poolObj.name} Account` : "Linked Bank Account",
          amount,
        };
      })
      .filter((l) => l.amount > 0);
  }, [lines, pools, linesMap]);

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

  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  const handleSaveSplit = async () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (!activeEventId) throw new Error("No active event ID");

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

      const effectiveLinesMap = { ...linesMap };
      if (sweepPool) {
        effectiveLinesMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      }

      const payloadLines = Object.entries(effectiveLinesMap).map(([bucketId, amountStr]) => ({
        poolId: bucketId,
        proposedAmount: (parseFloat(amountStr) || 0).toFixed(2),
      }));

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId: activeEventId,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payloadLines,
      });

      toast.success("Income Split saved.");
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      await utils.previewPayday.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save Income Split.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSplit = () => {
    setErrorMsg("");
    if (!validateInput()) return;
    setShowConfirmWarning(true);
  };

  const executeConfirmSplit = async () => {
    setShowConfirmWarning(false);
    setSubmitting(true);
    try {
      if (!activeEventId) throw new Error("No active event ID");

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

      const effectiveLinesMap = { ...linesMap };
      if (sweepPool) {
        effectiveLinesMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      }

      const payloadLines = Object.entries(effectiveLinesMap).map(([bucketId, amountStr]) => ({
        poolId: bucketId,
        amount: (parseFloat(amountStr) || 0).toFixed(2),
      }));

      await confirmPaydayMut.mutateAsync({
        incomeEventId: activeEventId,
        actualAmount: numericActual.toFixed(2),
        markAsReceivedToday: !isFutureDate,
        lines: payloadLines,
      });

      toast.success(t("paydayDrawer.confirmSuccess", { defaultValue: "Income Split confirmed and pool balances updated." }));
      await utils.listIncomeEvents.invalidate();
      await utils.listPools.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      await utils.previewPayday.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to confirm Income Split.");
    } finally {
      setSubmitting(false);
    }
  };

  const attemptClose = useCallback(() => {
    utils.listAllAllocationPlans.invalidate();
    utils.listIncomeEvents.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listPools.invalidate();
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose, utils]);

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
                  {sourceName || t("paydayDrawer.title", { defaultValue: "Income Split" })}
                </h2>
                {isSavedPlan && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200">
                    {t("paydayDrawer.savedBadge", { defaultValue: "SAVED" })}
                    <InfoTooltip
                      title={t("paydayDrawer.savedBadge", { defaultValue: "SAVED" })}
                      content={t("paydayDrawer.savedBadgeTooltip", { defaultValue: "Saved: You have a saved Income Split for this payday. Edit amounts or revert to auto-calculate." })}
                    />
                  </span>
                )}
                {isConfirmedPlan && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                    {t("paydayDrawer.confirmedBadge", { defaultValue: "CONFIRMED" })}
                    <InfoTooltip
                      title={t("paydayDrawer.confirmedBadge", { defaultValue: "CONFIRMED" })}
                      content={t("paydayDrawer.confirmedBadgeTooltip", { defaultValue: "Confirmed: This Income Split has been executed and pool balances updated. Use 'Unsave' to undo." })}
                    />
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                {t("paydayDrawer.subtitle", { defaultValue: "Review and confirm your Income Split across Pools" })}
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
            ) : previewQuery.isError ? (
              <div className="py-12 px-6 text-center text-red-600 dark:text-red-400 font-bold border-2 border-dashed border-red-200 dark:border-red-900/50 rounded-2xl mx-4">
                {t("paydayDrawer.errorLoading", { defaultValue: "Failed to load Income Split preview: " })} {previewQuery.error?.message}
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Review Income Section (Collapsible - Collapsed by default) */}
                <section className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="w-full flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsDetailsOpen((prev) => !prev)}
                      className="flex items-center gap-2 text-sm font-extrabold text-[#1B2B4B] dark:text-white text-left cursor-pointer"
                    >
                      <span className="text-zinc-500 font-extrabold text-xs">
                        {isDetailsOpen ? "▼" : "▶"}
                      </span>
                      <span>{t("paydayDrawer.reviewIncome", { defaultValue: "Review Income" })}</span>
                    </button>
                    
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {(isSavedPlan || isConfirmedPlan) && (
                        <>
                          <button
                            type="button"
                            onClick={handleRevertToAuto}
                            disabled={submitting}
                            className="font-bold text-xs text-[#2563eb] hover:underline cursor-pointer transition-colors"
                          >
                            {t("matrix.unsave", { defaultValue: "Unsave" })}
                          </button>
                          <span className="text-zinc-300 dark:text-zinc-700 select-none">|</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={submitting}
                        className="font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                      >
                        {t("common.delete", { defaultValue: "Delete" })}
                      </button>
                    </div>
                  </div>

                  {isDetailsOpen && (
                    <div className="space-y-4 pt-4 mt-3 border-t border-zinc-200 dark:border-zinc-700/60 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          {t("paydayDrawer.incomeSourceLabel", { defaultValue: "Income Source / Description" })} <span className="text-red-500">*</span>
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
                          {t("paydayDrawer.incomeAmountLabel", { defaultValue: "Income Amount ($)" })} <span className="text-red-500">*</span>
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

                {/* Split Income across Pools Section */}
                <section>
                  <h3 className="text-sm font-extrabold text-[#1B2B4B] dark:text-white mb-4 flex items-center gap-2">
                    {t("paydayDrawer.splitIncomeAcrossPools", { defaultValue: "Split Income across Pools" })}
                  </h3>

                  {/* Summary Header: Everyday, Bills, Goals */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("paydayDrawer.everyday", { defaultValue: "Everyday" })}</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(everydayAllocated)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("paydayDrawer.bills", { defaultValue: "Bills" })}</span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{fmt(regularAllocated)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">{t("paydayDrawer.goals", { defaultValue: "Goals" })}</span>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(goalAllocated)}</span>
                    </div>
                  </div>

                  {/* Confirmed 1-Tap Payday Transfer Plan */}
                  {isConfirmedPlan && transferLines.length > 0 && (
                    <div className="mb-4">
                      <PaydayTransferCard
                        paycheckAmount={numericActual}
                        paycheckDate={selectedDate}
                        lines={transferLines}
                      />
                    </div>
                  )}

                  {/* Grouped Pool Allocation Inputs with Expand/Collapse */}
                  <div className="space-y-3">
                    {groupedLines.map((group) => {
                      const isExpanded = Boolean(expandedTypes[group.type]);
                      const groupSum = group.items.reduce(
                        (acc, l) => acc + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0),
                        0
                      );

                      return (
                        <div key={group.type} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
                          {/* Pool Type Collapsible Header */}
                          <button
                            type="button"
                            onClick={() => toggleType(group.type)}
                            className="w-full py-2.5 px-3 bg-slate-100/90 dark:bg-zinc-800/70 hover:bg-slate-200/80 dark:hover:bg-zinc-800 flex items-center justify-between font-bold text-xs text-[#1B2B4B] dark:text-white cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 font-black text-[10px]">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="font-black uppercase tracking-wider text-[11px]">
                                {group.label} ({group.items.length})
                              </span>
                            </div>
                            <span className="font-mono font-bold text-xs text-zinc-700 dark:text-zinc-300">
                              {fmt(groupSum)}
                            </span>
                          </button>

                          {/* Pool Rows */}
                          {isExpanded && (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                              {group.items.map((l: AllocationLineItem) => {
                                const poolObj = pools.find((p) => p.id === l.bucketId);
                                const currentBal = poolObj ? parseFloat(String(poolObj.currentBalance || "0")) : 0;
                                const isSweepRow = Boolean(sweepPool && l.bucketId === sweepPool.id);
                                const displayVal = isSweepRow
                                  ? sweepPoolRemainder.toFixed(2)
                                  : (linesMap[l.bucketId] ?? l.proposedAmount.toFixed(2));

                                const targetRaw = poolObj
                                  ? (poolObj.poolType === "EVERYDAY"
                                      ? (poolObj.everydayAllowanceAmount || poolObj.targetAmount)
                                      : poolObj.targetAmount)
                                  : null;
                                const targetNum = targetRaw ? parseFloat(targetRaw) : 0;
                                const targetSuffix = poolObj?.poolType === "GOAL" ? "" : "/mo";

                                return (
                                  <div
                                    key={l.bucketId}
                                    className="py-2.5 px-3 pl-6 flex justify-between items-center group hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                                  >
                                    <div className="min-w-0 pr-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#1B2B4B] dark:text-white block truncate">
                                          {l.bucketName}
                                        </span>
                                        {isSweepRow && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                            {t("paydayDrawer.autoSurplusBadge", { defaultValue: "Auto-Surplus" })}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-zinc-400 font-mono block truncate">
                                        {t("paydayDrawer.balance", { defaultValue: "Balance:" })} {fmt(currentBal)}
                                      </span>
                                      {targetNum > 0 && (
                                        <span className="text-[10px] text-zinc-400 font-mono block truncate">
                                          {t("paydayDrawer.targetLabel", { defaultValue: "Target:" })} {fmt(targetNum)}{targetSuffix}
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      readOnly={isSweepRow}
                                      value={displayVal}
                                      onChange={(e) => !isSweepRow && handleLineAmountChange(l.bucketId, e.target.value)}
                                      className={`w-28 px-2.5 py-1.5 border rounded-lg text-right font-mono font-bold text-xs focus:outline-none tabular-nums ${
                                        isSweepRow
                                          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                                          : "border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                      }`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    <span>Surplus Pool ({sweepPool.name}):</span>
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

              <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={attemptClose}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs transition-colors cursor-pointer"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>

              <div className="flex items-center gap-2">
                {isFutureDate ? (
                  <Button
                    type="button"
                    onClick={handleSaveSplit}
                    loading={submitting}
                    disabled={isSweepNegative || submitting}
                    className="px-5 py-2 text-xs shadow-md font-bold cursor-pointer"
                  >
                    {t("common.save", { defaultValue: "Save" })}
                  </Button>
                ) : (
                  <>
                    {!isConfirmedPlan && (
                      <button
                        type="button"
                        onClick={handleSaveSplit}
                        disabled={isSweepNegative || submitting}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:underline px-2 py-1 cursor-pointer transition-colors"
                      >
                        {t("common.save", { defaultValue: "Save" })}
                      </button>
                    )}
                    {!isConfirmedPlan && (
                      <Button
                        type="button"
                        onClick={handleConfirmSplit}
                        loading={submitting}
                        disabled={isSweepNegative || submitting}
                        variant="danger"
                        className="px-5 py-2 text-xs shadow-md font-bold cursor-pointer"
                      >
                        {t("paydayDrawer.runIncomeSplit", { defaultValue: "Run Income Split" })}
                      </Button>
                    )}
                  </>
                )}
              </div>
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
        title={t("common.discardChangesTitle", { defaultValue: "Discard changes?" })}
        description={t("paydayDrawer.discardDescription", { defaultValue: "You have unsaved Income Split edits. Are you sure you want to discard them?" })}
        confirmLabel={t("common.discard", { defaultValue: "Discard" })}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showConfirmWarning}
        onClose={() => setShowConfirmWarning(false)}
        onConfirm={executeConfirmSplit}
        title={t("paydayDrawer.confirmWarningTitle", { defaultValue: "Run Income Split?" })}
        description={t("paydayDrawer.confirmWarningDescription", { defaultValue: "Running this payday split will update your pool and bank balances immediately, and mark this income as processed. Once processed, this split cannot be changed. Ready to split your income into your Pools?" })}
        confirmLabel={t("paydayDrawer.confirmWarningConfirm", { defaultValue: "Run Income Split" })}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteIncome}
        title={t("common.deleteIncomeTitle", { defaultValue: "Delete Income" })}
        description={t("paydayDrawer.deleteDescription", { defaultValue: "Are you sure you want to delete this Income?" })}
        confirmLabel={t("common.delete", { defaultValue: "Delete" })}
        variant="danger"
      />
    </div>
  );
}

