"use client";

import React from "react";
import { Spinner } from "@money-matters/ui/web";

interface SetupReconcileModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  totalRegularMonthly: number;
  totalEverydayMonthly: number;
  currentBillsCap: number;
  currentEverydayCap: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function SetupReconcileModal({
  isOpen,
  isSubmitting,
  totalRegularMonthly,
  totalEverydayMonthly,
  currentBillsCap,
  currentEverydayCap,
  onClose,
  onConfirm,
}: SetupReconcileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-6 border border-zinc-200">
        <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3">
          <span className="text-[10px] font-black uppercase text-[#00B4A6]">Budget Reconciliation Review</span>
          <h3 className="text-xl font-black text-[#1B2B4B]">Reconcile & Apply Budget Changes</h3>
          <p className="text-xs text-zinc-500 font-medium">
            Review the cap diffs and category adjustments before updating your household budget.
          </p>
        </div>

        {/* Cap Diffs Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl border border-zinc-200 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-zinc-500">Regular Bills Target</span>
            <span className="text-sm font-black text-[#1B2B4B]">${totalRegularMonthly.toLocaleString()} / mo</span>
            <span
              className={`text-[11px] font-bold ${
                totalRegularMonthly - currentBillsCap >= 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {totalRegularMonthly - currentBillsCap >= 0
                ? `+${totalRegularMonthly - currentBillsCap}`
                : totalRegularMonthly - currentBillsCap}{" "}
              diff vs current
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-zinc-200 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-zinc-500">Everyday Spending Pool</span>
            <span className="text-sm font-black text-[#1B2B4B]">${totalEverydayMonthly.toLocaleString()} / mo</span>
            <span
              className={`text-[11px] font-bold ${
                totalEverydayMonthly - currentEverydayCap >= 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {totalEverydayMonthly - currentEverydayCap >= 0
                ? `+${totalEverydayMonthly - currentEverydayCap}`
                : totalEverydayMonthly - currentEverydayCap}{" "}
              diff vs current
            </span>
          </div>
        </div>

        {/* Effective Date Notice */}
        <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-800 font-medium flex flex-col gap-1">
          <span className="font-bold">🗓️ Next Payday Effective Date:</span>
          <span>
            Your new pool target caps and category limits will take effect on your next scheduled payday allocation.
            Historical transactions will remain preserved.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold bg-[#22c55e] text-white rounded-xl hover:bg-emerald-600 shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Reconciling...</span>
              </>
            ) : (
              <span>Confirm & Reconcile Budget ✨</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
