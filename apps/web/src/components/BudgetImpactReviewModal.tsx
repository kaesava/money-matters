'use client';

import React from 'react';
import { StatusBadge } from '@money-matters/ui';
import { t } from '@money-matters/i18n';

export interface BudgetImpactReviewItem {
  id?: string;
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  monthlyAmount?: number | null;
  status: "ADDED" | "MODIFIED" | "ARCHIVED";
}

export interface BudgetImpactReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  oldEverydayCap: number;
  newEverydayCap: number;
  oldBillsCap: number;
  newBillsCap: number;
  items: BudgetImpactReviewItem[];
  nextPaydayDateStr?: string;
}

export function BudgetImpactReviewModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  oldEverydayCap,
  newEverydayCap,
  oldBillsCap,
  newBillsCap,
  items,
  nextPaydayDateStr = "next payday",
}: BudgetImpactReviewModalProps) {
  if (!isOpen) return null;

  const everydayDiff = newEverydayCap - oldEverydayCap;
  const billsDiff = newBillsCap - oldBillsCap;

  const formatDiff = (diff: number) => {
    if (diff === 0) return "$0";
    return diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("budget.reSetup.reviewTitle", { defaultValue: "Review Budget Impact" })}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("budget.reSetup.reviewSubtitle", { defaultValue: "Confirm adjustments before applying to your household budget" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Effective Date Banner */}
        <div className="my-4 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-100 dark:border-blue-900">
          ℹ️ {t("budget.reSetup.effectiveNotice", { defaultValue: `New pool caps take effect on your ${nextPaydayDateStr}. Current in-progress balances remain untouched.` })}
        </div>

        {/* Target Caps Comparison */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("budget.reSetup.billsCap", { defaultValue: "Bills Pool Cap" })}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              ${newBillsCap.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${billsDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {formatDiff(billsDiff)} /mo
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("budget.reSetup.everydayCap", { defaultValue: "Everyday Pool Cap" })}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              ${newEverydayCap.toFixed(2)}
            </p>
            <p className={`text-xs font-semibold ${everydayDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {formatDiff(everydayDiff)} /mo
            </p>
          </div>
        </div>

        {/* Itemized Changes List */}
        <div className="my-4 max-h-48 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 p-2 space-y-2">
          {items.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No sub-category line item changes.</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={item.status === "ADDED" ? "COMPLETED" : item.status === "ARCHIVED" ? "DRAFT" : "PARTIAL"}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                  {item.monthlyAmount ? `$${item.monthlyAmount.toFixed(2)}` : "-"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t("common.cancel", { defaultValue: "Cancel (0 Changes)" })}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("common.saving", { defaultValue: "Applying..." }) : t("budget.reSetup.apply", { defaultValue: "Apply Changes" })}
          </button>
        </div>
      </div>
    </div>
  );
}
