"use client";

import React, { useState, useEffect, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";
import { ModalDialog } from "../../../../components/web/ModalDialog";

export interface CategoryOption {
  id: string;
  name: string;
  poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  currentBalance: number | string;
  isSurplusTarget?: boolean;
}

export interface ShortfallTransferItem {
  poolId: string;
  amount: string;
}

export interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  billName: string;
  poolId?: string;
  poolName?: string;
  poolType?: string;
  initialAmount: number | string;
  initialDate: string;
  availableCategories: CategoryOption[];
  onConfirmMarkPaid: (params: {
    amount: number;
    date: string;
    transfers?: ShortfallTransferItem[];
  }) => Promise<void>;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MarkPaidModal({
  isOpen,
  onClose,
  billName,
  poolId,
  poolName,
  poolType,
  initialAmount,
  initialDate,
  availableCategories,
  onConfirmMarkPaid,
}: MarkPaidModalProps) {
  const [amountStr, setAmountStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const amt = typeof initialAmount === "number" ? initialAmount.toFixed(2) : String(initialAmount || "0.00");
      setAmountStr(amt);
      setDateStr(initialDate || new Date().toISOString().split("T")[0]);
    }
  }, [isOpen, initialAmount, initialDate]);

  const numAmount = useMemo(() => {
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amountStr]);

  // Find target pool balance
  const targetPool = useMemo(() => {
    if (!poolId) return null;
    return availableCategories.find((c) => c.id === poolId) || null;
  }, [availableCategories, poolId]);

  const targetBalance = useMemo(() => {
    if (!targetPool) return 0;
    const bal = typeof targetPool.currentBalance === "string" ? parseFloat(targetPool.currentBalance || "0") : (targetPool.currentBalance ?? 0);
    return isNaN(bal) ? 0 : bal;
  }, [targetPool]);

  const shortfallAmount = useMemo(() => {
    return Math.max(0, numAmount - targetBalance);
  }, [numAmount, targetBalance]);

  const hasShortfall = shortfallAmount > 0.001;

  // Filter out pools with balance <= 0 AND exclude the pool being paid (self)
  const validCategories = useMemo(() => {
    return availableCategories.filter((c) => {
      if (poolId && c.id === poolId) return false; // Exclude self!
      const bal = typeof c.currentBalance === "string" ? parseFloat(c.currentBalance || "0") : (c.currentBalance ?? 0);
      return bal > 0;
    });
  }, [availableCategories, poolId]);

  // Identify surplus target pool
  const surplusCategory = useMemo(() => {
    return validCategories.find((c) => c.isSurplusTarget) || validCategories[0];
  }, [validCategories]);

  // Group valid pools by poolType
  const groupedPools = useMemo(() => {
    const map: Record<string, CategoryOption[]> = {};
    for (const pool of validCategories) {
      const typeKey = pool.poolType || "OTHER";
      if (!map[typeKey]) map[typeKey] = [];
      map[typeKey].push(pool);
    }
    return map;
  }, [validCategories]);

  // Initialize transfer amounts when shortfall changes
  useEffect(() => {
    if (!isOpen || !hasShortfall) {
      setTransferAmounts({});
      return;
    }

    const initialAmounts: Record<string, string> = {};
    if (surplusCategory) {
      const surplusBal = typeof surplusCategory.currentBalance === "string"
        ? parseFloat(surplusCategory.currentBalance || "0")
        : (surplusCategory.currentBalance ?? 0);
      const prefill = Math.min(shortfallAmount, surplusBal);
      if (prefill > 0) {
        initialAmounts[surplusCategory.id] = prefill.toFixed(2);
      }
    }
    setTransferAmounts(initialAmounts);

    const surplusType = surplusCategory?.poolType || "OTHER";
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(groupedPools).forEach((typeKey) => {
      initialExpanded[typeKey] = typeKey === surplusType;
    });
    setExpandedGroups(initialExpanded);
  }, [isOpen, hasShortfall, shortfallAmount, surplusCategory, groupedPools]);

  const toggleGroup = (typeKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [typeKey]: !prev[typeKey],
    }));
  };

  const handleAmountChange = (pId: string, maxBal: number, rawVal: string) => {
    if (rawVal === "") {
      setTransferAmounts((prev) => ({ ...prev, [pId]: "" }));
      return;
    }
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setTransferAmounts((prev) => ({ ...prev, [pId]: "0.00" }));
      return;
    }
    const capped = Math.min(parsed, maxBal);
    setTransferAmounts((prev) => ({ ...prev, [pId]: capped.toString() }));
  };

  const totalAllocated = useMemo(() => {
    return Object.values(transferAmounts).reduce((sum, valStr) => {
      const num = parseFloat(valStr || "0");
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [transferAmounts]);

  const isFulfilled = !hasShortfall || totalAllocated >= shortfallAmount - 0.001;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (numAmount <= 0 || !isFulfilled) return;
    setIsSubmitting(true);

    const transfers: ShortfallTransferItem[] = hasShortfall
      ? Object.entries(transferAmounts)
          .map(([pId, amountStr]) => ({
            poolId: pId,
            amount: parseFloat(amountStr || "0").toFixed(2),
          }))
          .filter((item) => parseFloat(item.amount) > 0)
      : [];

    try {
      await onConfirmMarkPaid({
        amount: numAmount,
        date: dateStr,
        transfers,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedPoolType = poolType ? (poolType === "EVERYDAY" ? "Everyday" : poolType === "REGULAR" ? "Bills" : "Goal") : "Everyday";
  const formattedPoolName = poolName || targetPool?.name || "Pool";

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("incomeBillsTabs.markPaidModalTitle", { defaultValue: "Mark Expense Paid" })}
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {/* Editable Amount & Date Inputs */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              {t("common.amount", { defaultValue: "Amount ($)" })} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              {t("common.date", { defaultValue: "Date Paid" })} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        {hasShortfall ? (
          <>
            {/* Insufficient Funds Warning Banner */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
                {t("incomeBillsTabs.insufficientModalMessage", {
                  billName: billName || "Expense",
                  poolType: formattedPoolType,
                  poolName: formattedPoolName,
                  amount: fmt(shortfallAmount),
                  defaultValue: `The Expense ${billName || "Expense"} cannot be paid as the ${formattedPoolType} Pool "${formattedPoolName}" is short ${fmt(shortfallAmount)}. Select the Pools to transfer funds from to ensure sufficient balance.`,
                })}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1B2B4B] dark:text-zinc-200 uppercase tracking-wider">
                {t("incomeBillsTabs.fundingSourceSelectLabel", { defaultValue: "Select Funding Source to cover shortfall:" })}
              </label>
              <span className="text-[11px] text-zinc-400 italic">
                {t("incomeBillsTabs.hiddenZeroBalanceNote", { defaultValue: "Pools with a $0 balance are hidden." })}
              </span>
            </div>

            {/* Grouped Table Accordion */}
            <div className="max-h-[35vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
              {Object.keys(groupedPools).length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 font-semibold">
                  No other pools with available balances found to cover the shortfall.
                </div>
              ) : (
                Object.entries(groupedPools).map(([typeKey, poolsInGroup]) => {
                  const isExpanded = !!expandedGroups[typeKey];
                  return (
                    <div key={typeKey} className="bg-white dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => toggleGroup(typeKey)}
                        className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span>{typeKey} Pools</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            {poolsInGroup.length}
                          </span>
                        </span>
                        <span>{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {isExpanded && (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/40 dark:bg-zinc-900">
                              <th className="py-2 px-4 text-left">Pool</th>
                              <th className="py-2 px-4 text-right">Available</th>
                              <th className="py-2 px-4 text-right">Transfer ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                            {poolsInGroup.map((pool) => {
                              const bal = typeof pool.currentBalance === "string"
                                ? parseFloat(pool.currentBalance || "0")
                                : (pool.currentBalance ?? 0);
                              const currentVal = transferAmounts[pool.id] ?? "";

                              return (
                                <tr key={pool.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                                  <td className="py-2.5 px-4 text-left font-medium text-zinc-900 dark:text-white">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span>{pool.name}</span>
                                      {pool.isSurplusTarget && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                          Surplus
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                                    {fmt(bal)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      max={bal}
                                      step="0.01"
                                      value={currentVal}
                                      onChange={(e) => handleAmountChange(pool.id, bal, e.target.value)}
                                      placeholder="0.00"
                                      className="w-24 px-2 py-1 text-right font-mono font-bold border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-[#2563eb] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Allocation Progress Bar */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs font-bold">
              <span className="text-zinc-600 dark:text-zinc-400">
                Total Allocated: <span className="font-mono text-zinc-900 dark:text-white">{fmt(totalAllocated)}</span>
              </span>
              <span className={isFulfilled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {isFulfilled ? "✓ Shortfall Covered" : `Remaining: ${fmt(Math.max(0, shortfallAmount - totalAllocated))}`}
              </span>
            </div>
          </>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Sufficient pool balance available ({fmt(targetBalance)}). Click confirm to mark paid.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={numAmount <= 0 || !isFulfilled || isSubmitting}
            onClick={handleConfirm}
          >
            {hasShortfall
              ? t("incomeBillsTabs.confirmTransferAndPay", { defaultValue: "Confirm Transfer & Mark Paid" })
              : t("common.markPaid", { defaultValue: "Mark Paid" })}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
