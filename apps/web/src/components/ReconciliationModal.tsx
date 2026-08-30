"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { Spinner } from "@money-matters/ui/web";
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
  expectedBalance: number;
  newBalance: number;
  pools: PoolItem[];
  onConfirm: (selectedPoolId: string) => Promise<void>;
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
  pools,
  onConfirm,
  onOpenTransferModal,
}) => {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const diff = Number((newBalance - expectedBalance).toFixed(2));
  const isSurplus = diff > 0;
  const absDiff = Math.abs(diff);

  // Pre-selection & ESC listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Determine initial selected pool
    const surplusPool = pools.find((p) => p.isSurplusTarget);
    if (isSurplus) {
      if (surplusPool) {
        setSelectedPoolId(surplusPool.id);
      } else if (pools.length > 0) {
        setSelectedPoolId(pools[0].id);
      }
    } else {
      // Draw-down: check if surplus pool has sufficient funds
      if (surplusPool && surplusPool.currentBalance >= absDiff) {
        setSelectedPoolId(surplusPool.id);
      } else {
        const firstValidPool = pools.find((p) => p.currentBalance >= absDiff);
        setSelectedPoolId(firstValidPool ? firstValidPool.id : "");
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSurplus, absDiff, pools, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validPoolsExist = isSurplus || pools.some((p) => p.currentBalance >= absDiff);

  const handleConfirmSubmit = async () => {
    if (!selectedPoolId) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedPoolId);
      posthog.capture("bank_account_aligned", {
        account_name: accountName,
        diff_amount: diff,
        is_surplus: isSurplus,
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
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
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

        {/* Read-Only Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected</span>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5">{fmtMoney(expectedBalance)}</span>
          </div>
          <div className="flex flex-col border-x border-slate-200 px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Balance</span>
            <span className="font-mono font-bold text-slate-900 text-xs mt-0.5">{fmtMoney(newBalance)}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difference</span>
            <span className={`font-mono font-bold text-xs mt-0.5 ${isSurplus ? "text-emerald-600" : "text-amber-600"}`}>
              {isSurplus ? `+${fmtMoney(diff)}` : `-${fmtMoney(absDiff)}`}
            </span>
          </div>
        </div>

        {/* Contextual Notice */}
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium ${
          isSurplus ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" : "bg-amber-50/80 border-amber-200 text-amber-900"
        }`}>
          {isSurplus ? (
            <p>
              The bank account has <strong className="font-bold">{fmtMoney(diff)} more</strong> than expected. Select a pool to receive this surplus:
            </p>
          ) : (
            <p>
              The bank account has <strong className="font-bold">{fmtMoney(absDiff)} less</strong> than expected. Select a pool for this draw-down:
            </p>
          )}
        </div>

        {/* Pool Picker */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Linked Pools Available
          </label>
          {pools.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">No pools currently linked to this bank account.</p>
          ) : (
            pools.map((pool) => {
              const isDisabled = !isSurplus && pool.currentBalance < absDiff;
              const isSelected = selectedPoolId === pool.id;

              return (
                <button
                  key={pool.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelectedPoolId(pool.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                      : isSelected
                      ? "border-[#2563eb] bg-blue-50/70 text-[#1B2B4B] shadow-xs"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{pool.name}</span>
                      {pool.isSurplusTarget && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                          Sweep Goal
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      Available: {fmtMoney(pool.currentBalance)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDisabled && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Insufficient Funds
                      </span>
                    )}
                    {isSelected && <span className="text-[#2563eb] font-bold text-sm">✓</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Transfer Funds Hyperlink Prompt if all pools disabled for draw-down */}
        {!validPoolsExist && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1.5">
            <p className="font-semibold">
              No single linked pool has sufficient available funds ({fmtMoney(absDiff)}) for this draw-down.
            </p>
            {onOpenTransferModal && (
              <button
                type="button"
                onClick={onOpenTransferModal}
                className="text-red-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Transfer funds between pools →</span>
              </button>
            )}
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

          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={!selectedPoolId || isSubmitting}
            className="flex-1 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Saving...</span>
              </>
            ) : (
              t("common.confirm", { defaultValue: "Confirm" })
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
