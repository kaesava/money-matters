"use client";

import React, { useState, useEffect, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { Button } from "@money-matters/ui/web";

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

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  billName: string;
  shortfallAmount: number;
  availableCategories: CategoryOption[];
  onConfirmTransferAndPay: (transfers: ShortfallTransferItem[]) => Promise<void>;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InsufficientFundsModal({
  isOpen,
  onClose,
  billName,
  shortfallAmount,
  availableCategories,
  onConfirmTransferAndPay,
}: InsufficientFundsModalProps) {
  // Filter out pools with balance <= 0
  const validCategories = useMemo(() => {
    return availableCategories.filter((c) => {
      const bal = typeof c.currentBalance === "string" ? parseFloat(c.currentBalance || "0") : (c.currentBalance ?? 0);
      return bal > 0;
    });
  }, [availableCategories]);

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

  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize transfer amounts and expanded accordion state when modal opens
  useEffect(() => {
    if (!isOpen) return;

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

    // Expand only the group containing the surplus category by default
    const surplusType = surplusCategory?.poolType || "OTHER";
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(groupedPools).forEach((typeKey) => {
      initialExpanded[typeKey] = typeKey === surplusType;
    });
    setExpandedGroups(initialExpanded);
  }, [isOpen, shortfallAmount, surplusCategory, groupedPools]);

  const toggleGroup = (typeKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [typeKey]: !prev[typeKey],
    }));
  };

  const handleAmountChange = (poolId: string, maxBal: number, rawVal: string) => {
    if (rawVal === "") {
      setTransferAmounts((prev) => ({ ...prev, [poolId]: "" }));
      return;
    }
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setTransferAmounts((prev) => ({ ...prev, [poolId]: "0.00" }));
      return;
    }
    // Cap at pool's available balance
    const capped = Math.min(parsed, maxBal);
    setTransferAmounts((prev) => ({ ...prev, [poolId]: capped.toString() }));
  };

  const totalAllocated = useMemo(() => {
    return Object.values(transferAmounts).reduce((sum, valStr) => {
      const num = parseFloat(valStr || "0");
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [transferAmounts]);

  const isFulfilled = totalAllocated >= shortfallAmount - 0.001; // Epsilon tolerance for floating point

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isFulfilled) return;
    setIsSubmitting(true);

    const transfers: ShortfallTransferItem[] = Object.entries(transferAmounts)
      .map(([poolId, amountStr]) => ({
        poolId,
        amount: parseFloat(amountStr || "0").toFixed(2),
      }))
      .filter((item) => parseFloat(item.amount) > 0);

    try {
      await onConfirmTransferAndPay(transfers);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        <h3 className="text-lg font-black text-[#1B2B4B] dark:text-white">
          {t("incomeBillsTabs.insufficientModalTitle", { defaultValue: "Insufficient Funds in Pool" })}
        </h3>

        <div className="flex flex-col gap-4 py-3">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("incomeBillsTabs.insufficientModalMessage", {
                amount: fmt(shortfallAmount),
                defaultValue: `You are short ${fmt(shortfallAmount)} to mark this bill as paid.`,
              })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Paying <strong>{billName}</strong> requires an additional {fmt(shortfallAmount)} to avoid a negative pool balance.
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

          {/* Grouped Table Accordion with Scroll Container */}
          <div className="max-h-[45vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
            {Object.keys(groupedPools).length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-semibold">
                No pools with available balances found to cover the shortfall.
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

          {/* Allocation Progress Bar / Summary */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs font-bold">
            <span className="text-zinc-600 dark:text-zinc-400">
              Total Allocated: <span className="font-mono text-zinc-900 dark:text-white">{fmt(totalAllocated)}</span>
            </span>
            <span className={isFulfilled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
              {isFulfilled ? "✓ Shortfall Covered" : `Remaining: ${fmt(Math.max(0, shortfallAmount - totalAllocated))}`}
            </span>
          </div>

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
              disabled={!isFulfilled || isSubmitting}
              onClick={handleConfirm}
            >
              {t("incomeBillsTabs.confirmTransferAndPay", { defaultValue: "Confirm Transfer & Mark Paid" })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
