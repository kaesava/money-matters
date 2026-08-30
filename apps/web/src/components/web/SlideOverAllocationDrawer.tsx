"use client";

import React, { useEffect } from "react";
import { fmtDate } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface PaydayPlanLineRecord {
  planId: string;
  categoryId?: string | null;
  poolId?: string | null;
  proposedAmount: string;
  confirmedAmount: string | null;
  reasoning: string | null;
  poolName?: string | null;
  categoryName?: string | null;
}

export interface PaydayPlanRecord {
  id: string;
  totalIncomeAmount: string;
  status: string | null;
  createdAt: string | Date;
  expectedDate?: string | null;
  incomeName?: string | null;
  receivingAccountName?: string | null;
  lines: PaydayPlanLineRecord[];
}

interface SlideOverAllocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PaydayPlanRecord | null;
}

export function SlideOverAllocationDrawer({
  isOpen,
  onClose,
  plan,
}: SlideOverAllocationDrawerProps) {
  // ESC key dismissal (AGENTS.md Rule 13)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !plan) return null;

  const formatAUD = (val: number | string): string => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">
                  {plan.status || "CONFIRMED"}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  {fmtDate(plan.expectedDate || plan.createdAt)}
                </span>
              </div>
              <h2 className="text-xl font-black text-[#1B2B4B] dark:text-white tracking-tight mt-1">
                {t("payday.allocationDetails")}
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                💰 {plan.incomeName || "Income Deposit"} → 🏦 {plan.receivingAccountName || "Main Account"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Income Summary Banner */}
          <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{t("payday.totalIncomeNet")}</span>
            <span className="text-lg font-black font-mono text-[#2563eb]">
              {formatAUD(plan.totalIncomeAmount)}
            </span>
          </div>

          {/* Waterfall Lines List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Waterfall Breakdown ({plan.lines.length} pools)
            </h3>
            {plan.lines.map((line, idx) => (
              <div
                key={line.planId + (line.poolId || line.categoryId || idx)}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {line.poolName || line.categoryName || "Pool Allocation"}
                  </h4>
                  <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatAUD(line.confirmedAmount || line.proposedAmount)}
                  </span>
                </div>
                {line.reasoning && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed">
                    {line.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Drawer Footer */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900 z-10 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
