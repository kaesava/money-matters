"use client";

import React, { useState, useEffect, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip, Button } from "@money-matters/ui/web";
import posthog from "../lib/posthog-client";

export interface PoolItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance: number;
  isSurplusTarget?: boolean;
}

export interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  expectedBalance: number; // Total available across linked pools
  newBalance: number;      // New bank balance entered
  unbudgetedBuffer?: number;
  pools: PoolItem[];
  onConfirm: (splits: Array<{ poolId: string; adjustment: string }>) => Promise<void>;
  onOpenTransferModal?: () => void;
}

function fmtMoney(num: number) {
  return `$${Math.abs(num).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  accountName,
  expectedBalance,
  newBalance,
  unbudgetedBuffer = 0,
  pools,
  onConfirm,
  onOpenTransferModal,
}) => {
  const newAvailableToBudget = Math.max(0, newBalance - unbudgetedBuffer);
  const variance = Number((newAvailableToBudget - expectedBalance).toFixed(2));
  const isSurplus = variance > 0;
  const absVariance = Math.abs(variance);

  // Filter visible pools: hide $0 balance pools during shortfalls
  const visiblePools = useMemo(() => {
    if (!isSurplus) {
      return pools.filter((p) => p.currentBalance > 0);
    }
    return pools;
  }, [pools, isSurplus]);

  const hasHiddenZeroPools = !isSurplus && pools.some((p) => p.currentBalance <= 0);

  // State for entered adjustment amounts per poolId
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill sweep goal pool with 100% of variance on open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const initialAdjustments: Record<string, string> = {};
    visiblePools.forEach((p) => {
      initialAdjustments[p.id] = "0.00";
    });

    const sweepPool = visiblePools.find((p) => p.isSurplusTarget) || visiblePools[0];
    if (sweepPool) {
      if (!isSurplus && sweepPool.currentBalance < absVariance) {
        // Sweep goal doesn't have full funds, pre-fill max available or clear
        initialAdjustments[sweepPool.id] = Math.min(sweepPool.currentBalance, absVariance).toFixed(2);
      } else {
        initialAdjustments[sweepPool.id] = absVariance.toFixed(2);
      }
    }

    setAdjustments(initialAdjustments);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, absVariance, isSurplus, visiblePools, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Calculate sum of entered positive numbers
  const sumAdjustments = Number(
    Object.values(adjustments)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
      .toFixed(2)
  );

  const isSumValid = Math.abs(sumAdjustments - absVariance) < 0.009;

  const handleAdjustmentChange = (poolId: string, inputVal: string, maxAvailable: number) => {
    let valNum = parseFloat(inputVal) || 0;
    if (valNum < 0) valNum = 0;

    // Enforce drawdown cap for shortfalls
    if (!isSurplus && valNum > maxAvailable) {
      valNum = maxAvailable;
    }

    setAdjustments((prev) => ({
      ...prev,
      [poolId]: inputVal === "" ? "" : valNum.toString(),
    }));
  };

  const handleConfirmSubmit = async () => {
    if (!isSumValid) return;

    const splits = Object.entries(adjustments)
      .filter(([_, val]) => (parseFloat(val) || 0) > 0)
      .map(([poolId, val]) => {
        const amt = parseFloat(val) || 0;
        const signedAmt = isSurplus ? amt : -amt;
        return {
          poolId,
          adjustment: signedAmt.toFixed(2),
        };
      });

    setIsSubmitting(true);
    try {
      await onConfirm(splits);
      posthog.capture("bank_account_aligned", {
        account_name: accountName,
        diff_amount: variance,
        is_surplus: isSurplus,
        splits_count: splits.length,
      });
      onClose();
    } catch (err) {
      console.error("Failed to confirm balance alignment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-[#1B2B4B]">
              {t("modals.reconciliation.title", { defaultValue: "Bank Account Alignment" })}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected Total</span>
              <InfoTooltip content="Calculated as the total available balance across all pools currently linked to this bank account." />
            </div>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5">{fmtMoney(expectedBalance)}</span>
          </div>

          <div className="flex flex-col border-x border-slate-200 px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available to Budget</span>
            <span className="font-mono font-bold text-slate-900 text-xs mt-0.5">{fmtMoney(newAvailableToBudget)}</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difference</span>
            <span className={`font-mono font-bold text-xs mt-0.5 ${isSurplus ? "text-emerald-600" : "text-amber-600"}`}>
              {isSurplus ? `+${fmtMoney(variance)}` : `-${fmtMoney(absVariance)}`}
            </span>
          </div>
        </div>

        {/* Contextual Notice */}
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium ${
          isSurplus ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
        }`}>
          {isSurplus ? (
            <p>
              Select the pools where this <strong className="font-bold">surplus ({fmtMoney(absVariance)})</strong> will go:
            </p>
          ) : (
            <p>
              Select the pools where this <strong className="font-bold">shortfall ({fmtMoney(absVariance)})</strong> will come from:
            </p>
          )}
        </div>

        {/* Interactive Multi-Pool Adjustment Table */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2 text-left">Pool</th>
                <th className="py-2 text-right">Available</th>
                <th className="py-2 text-right w-28">Adjustment ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {visiblePools.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400 italic">No valid linked pools available.</td>
                </tr>
              ) : (
                visiblePools.map((pool) => {
                  const val = adjustments[pool.id] ?? "0.00";
                  const badgeStyle = pool.poolType === "EVERYDAY" ? "bg-emerald-50 text-emerald-700" : pool.poolType === "REGULAR" ? "bg-blue-50 text-[#2563eb]" : "bg-indigo-50 text-indigo-700";

                  return (
                    <tr key={pool.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 text-left">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1B2B4B]">{pool.name}</span>
                            {pool.isSurplusTarget && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-md">
                                Sweep Goal
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-bold inline-block w-max mt-0.5 rounded px-1.5 py-0.2 ${badgeStyle}`}>
                            {pool.poolType === "EVERYDAY" ? "Everyday" : pool.poolType === "REGULAR" ? "Bills" : "Goal"}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 text-right font-mono font-bold text-slate-600">
                        {fmtMoney(pool.currentBalance)}
                      </td>

                      <td className="py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          autoFocus={visiblePools.indexOf(pool) === 0}
                          max={!isSurplus ? pool.currentBalance : undefined}
                          value={val}
                          onChange={(e) => handleAdjustmentChange(pool.id, e.target.value, pool.currentBalance)}
                          className="w-24 px-2.5 py-1.5 text-right font-mono font-bold text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {hasHiddenZeroPools && (
            <p className="text-[10px] text-slate-400 italic pt-1">
              Note: Pools with $0.00 balance are hidden as they cannot absorb a shortfall.
            </p>
          )}
        </div>

        {/* Live Sum Validation Status */}
        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100">
          <span className="text-slate-500">Allocated Split Total:</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold ${isSumValid ? "text-emerald-600" : "text-amber-600"}`}>
              {fmtMoney(sumAdjustments)} / {fmtMoney(absVariance)}
            </span>
            {isSumValid ? (
              <span className="text-emerald-600 font-bold">✓ Matches</span>
            ) : (
              <span className="text-amber-600 font-bold text-[10px]">
                (${fmtMoney(Math.abs(absVariance - sumAdjustments))} remaining)
              </span>
            )}
          </div>
        </div>

        {/* Unconditional Transfer Hyperlink */}
        {onOpenTransferModal && (
          <div className="text-right">
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Transfer funds between pools →</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>

          <Button
            type="button"
            onClick={handleConfirmSubmit}
            loading={isSubmitting}
            disabled={!isSumValid}
            className="flex-1"
          >
            {t("common.confirm", { defaultValue: "Confirm" })}
          </Button>
        </div>

      </div>
    </div>
  );
};
