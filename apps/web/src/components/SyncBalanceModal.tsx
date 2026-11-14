"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import { t } from "@money-matters/i18n";
import { Button, AmountField, useModalDismiss } from "@money-matters/ui/web";
import posthog from "../lib/posthog-client";
import { useLocale } from "../providers/LocaleProvider";
import { SyncBalanceAdvancedTable } from "./SyncBalanceAdvancedTable";

export interface PoolItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance: number;
  isSurplusTarget?: boolean;
}

export interface SyncBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  expectedBalance: number; // Total available across linked pools
  initialActualBalance?: number;
  newBalance?: number;     // Initial bank balance (defaults to last known)
  unbudgetedBuffer?: number;
  pools: PoolItem[];
  onConfirm: (
    splits: Array<{ poolId: string; adjustment: string }>,
    actualBalance: string,
    reason?: string
  ) => Promise<void>;
  onOpenTransferModal?: () => void;
}

export const SyncBalanceModal: React.FC<SyncBalanceModalProps> = ({
  isOpen,
  onClose,
  accountName,
  expectedBalance,
  initialActualBalance,
  newBalance = 0,
  unbudgetedBuffer = 0,
  pools,
  onConfirm,
  onOpenTransferModal,
}) => {
  const { fmt, currency, currencySymbol, minorUnits } = useLocale();
  const fmtMoney = (num: number) => fmt(Math.abs(num));

  const resolvedInitial = (initialActualBalance !== undefined ? initialActualBalance : newBalance).toFixed(2);
  const [enteredBalance, setEnteredBalance] = useState<string>(resolvedInitial);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const modalId = useId();

  useEffect(() => {
    if (isOpen) {
      const initVal = (initialActualBalance !== undefined ? initialActualBalance : newBalance).toFixed(2);
      setEnteredBalance(initVal);
      setIsAdvancedOpen(false);
      setReason("");
    }
  }, [isOpen, initialActualBalance, newBalance]);

  const numericBalance = Math.max(0, parseFloat(enteredBalance) || 0);
  const newAvailableToBudget = Math.max(0, numericBalance - unbudgetedBuffer);
  const variance = Number((newAvailableToBudget - expectedBalance).toFixed(2));
  const isSurplus = variance > 0;
  const absVariance = Math.abs(variance);
  const isZeroVariance = Math.abs(variance) < 0.009;

  // Check if any pool is an explicit surplus target
  const hasSurplusTargetInList = useMemo(() => pools.some((p) => p.isSurplusTarget), [pools]);

  // Sweep target pool: explicit isSurplusTarget, or fallback to EVERYDAY pool, or first pool
  const isPoolSweepTarget = React.useCallback(
    (p: PoolItem) => Boolean(p.isSurplusTarget || (!hasSurplusTargetInList && p.poolType === "EVERYDAY")),
    [hasSurplusTargetInList]
  );

  // Filter and sort visible pools: sweep target is always visible even if $0, and sorted first
  const visiblePools = useMemo(() => {
    let list: PoolItem[];
    if (!isSurplus) {
      list = pools.filter((p) => isPoolSweepTarget(p) || p.poolType === "EVERYDAY" || p.currentBalance > 0);
    } else {
      list = [...pools];
    }

    return list.sort((a, b) => {
      const aSweep = isPoolSweepTarget(a);
      const bSweep = isPoolSweepTarget(b);
      if (aSweep && !bSweep) return -1;
      if (!aSweep && bSweep) return 1;
      return 0;
    });
  }, [pools, isSurplus, isPoolSweepTarget]);

  const sweepPool = useMemo(() => {
    return visiblePools.find(isPoolSweepTarget) || visiblePools[0] || pools[0];
  }, [visiblePools, isPoolSweepTarget, pools]);

  const hasHiddenZeroPools = !isSurplus && pools.some((p) => !isPoolSweepTarget(p) && p.poolType !== "EVERYDAY" && p.currentBalance <= 0);

  useModalDismiss({
    id: `reconciliation-modal-${modalId}`,
    isOpen,
    onDismiss: onClose,
    isBlocked: isSubmitting,
  });

  // Pre-fill sweep target pool on variance change
  useEffect(() => {
    if (!isOpen) return;

    const initialAdjustments: Record<string, string> = {};
    visiblePools.forEach((p) => {
      initialAdjustments[p.id] = "0.00";
    });

    if (sweepPool) {
      if (isSurplus) {
        initialAdjustments[sweepPool.id] = absVariance.toFixed(2);
      } else {
        const maxDrawdown = Math.min(Math.max(0, sweepPool.currentBalance), absVariance);
        initialAdjustments[sweepPool.id] = maxDrawdown.toFixed(2);
      }
    }

    setAdjustments(initialAdjustments);
  }, [isOpen, absVariance, isSurplus, visiblePools, sweepPool]);

  if (!isOpen) return null;

  // Calculate sum of entered positive numbers in advanced mode
  const sumAdjustments = Number(
    Object.values(adjustments)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
      .toFixed(2)
  );

  const isSumValid = Math.abs(sumAdjustments - absVariance) < 0.009;

  const handleAdjustmentChange = (poolId: string, inputVal: string, maxAvailable: number) => {
    if (inputVal === "") {
      setAdjustments((prev) => ({ ...prev, [poolId]: "" }));
      return;
    }
    if (!/^\d*(\.\d{0,2})?$/.test(inputVal)) {
      return;
    }
    const valNum = parseFloat(inputVal) || 0;
    if (!isSurplus && valNum > maxAvailable) {
      setAdjustments((prev) => ({
        ...prev,
        [poolId]: maxAvailable.toFixed(2),
      }));
      return;
    }

    setAdjustments((prev) => ({
      ...prev,
      [poolId]: inputVal,
    }));
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      let splits: Array<{ poolId: string; adjustment: string }> = [];

      if (!isAdvancedOpen) {
        // Simple 1-Click Default Mode
        if (!isZeroVariance && sweepPool) {
          splits = [
            {
              poolId: sweepPool.id,
              adjustment: variance.toFixed(2),
            },
          ];
        }
      } else {
        // Advanced Multi-Pool Mode
        if (!isSumValid) return;
        splits = Object.entries(adjustments)
          .filter(([_, val]) => (parseFloat(val) || 0) > 0)
          .map(([poolId, val]) => {
            const amt = parseFloat(val) || 0;
            const signedAmt = isSurplus ? amt : -amt;
            return {
              poolId,
              adjustment: signedAmt.toFixed(2),
            };
          });
      }

      await onConfirm(splits, numericBalance.toFixed(2), reason.trim() || undefined);
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
      <div className="bg-white dark:bg-zinc-900 max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="font-extrabold text-lg text-[#1B2B4B] dark:text-white">
              {t("bankAccounts.reconcile.modalTitle")}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 font-bold p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Editable Current Bank Balance */}
        <div className="bg-slate-50/70 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 space-y-3">
          <AmountField
            label={t("bankAccounts.reconcile.currentBankBalanceLabel")}
            value={enteredBalance}
            onChange={setEnteredBalance}
            autoFocus={true}
            placeholder="0.00"
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />

          {/* Metric Comparison Strip */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("bankAccounts.reconcile.expectedTotal")}
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{fmtMoney(expectedBalance)}</span>
            </div>

            <div className="flex flex-col border-x border-slate-200/60 dark:border-zinc-700/60 px-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("bankAccounts.reconcile.availableToBudget")}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{fmtMoney(newAvailableToBudget)}</span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("bankAccounts.reconcile.difference")}
              </span>
              <span className={`font-mono font-bold mt-0.5 ${isZeroVariance ? "text-emerald-600 dark:text-emerald-400" : isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {isZeroVariance ? "Balanced ✓" : isSurplus ? `+${fmtMoney(variance)}` : `-${fmtMoney(absVariance)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Smart 1-Click Default Card (when advanced is folded) */}
        {!isAdvancedOpen && (
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium transition-colors ${
            isZeroVariance
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
              : isSurplus
              ? "bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
              : "bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
          }`}>
            <p className="font-bold">
              {isZeroVariance
                ? t("bankAccounts.reconcile.balancedNotice")
                : isSurplus
                ? t("bankAccounts.reconcile.defaultAddNotice", { name: sweepPool?.name || "Everyday" })
                : t("bankAccounts.reconcile.defaultDeductNotice", { name: sweepPool?.name || "Everyday" })}
            </p>
          </div>
        )}

        {/* Advanced Accordion Toggle */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <span>{isAdvancedOpen ? "▼" : "▶"}</span>
            <span>{t("bankAccounts.reconcile.advancedSplitToggle")}</span>
          </button>
        </div>

        {/* Step 3: Advanced Multi-Pool Adjustment Table (when expanded) */}
        {isAdvancedOpen && (
          <SyncBalanceAdvancedTable
            reason={reason}
            setReason={setReason}
            visiblePools={visiblePools}
            adjustments={adjustments}
            handleAdjustmentChange={handleAdjustmentChange}
            isSurplus={isSurplus}
            hasHiddenZeroPools={hasHiddenZeroPools}
            sumAdjustments={sumAdjustments}
            absVariance={absVariance}
            isSumValid={isSumValid}
            fmtMoney={fmtMoney}
            currency={currency}
            currencySymbol={currencySymbol}
            minorUnits={minorUnits}
          />
        )}

        {/* Unconditional Transfer Hyperlink */}
        {onOpenTransferModal && (
          <div className="text-right">
            <button
              type="button"
              onClick={onOpenTransferModal}
              className="text-xs font-bold text-[#2563eb] dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>{t("bankAccounts.reconcile.transferBetweenPoolsLink")}</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            {t("common.cancel")}
          </button>

          <Button
            type="button"
            onClick={handleConfirmSubmit}
            loading={isSubmitting}
            disabled={isAdvancedOpen && !isZeroVariance && !isSumValid}
            className="flex-1"
          >
            {isZeroVariance
              ? t("bankAccounts.reconcile.saveBalanceOnly")
              : t("bankAccounts.reconcile.updateBalance")}
          </Button>
        </div>

      </div>
    </div>
  );
};
