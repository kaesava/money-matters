"use client";

import React, { useEffect } from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../providers/LocaleProvider";

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
  incomeDate?: string | null;
  incomeName?: string | null;
  receivingAccountId?: string | null;
  receivingAccountName?: string | null;
  note?: string | null;
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
  const { fmt, fmtDate } = useLocale();

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
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <div className="flex-1 pr-4">
              <h2 className="text-xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
                {t("paydayDrawer.incomeSplitDetails", { defaultValue: "Income Split Details" })}
              </h2>
              <div className="mt-4 p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    {t("paydayDrawer.incomeSource", { defaultValue: "Income Source" })}
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-100">{plan.incomeName || "Income Deposit"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    {t("paydayDrawer.bankAccount", { defaultValue: "Bank Account" })}
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-100">{plan.receivingAccountName || "Main Account"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    {t("paydayDrawer.incomeDate", { defaultValue: "Income Date" })}
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{fmtDate(plan.expectedDate || plan.incomeDate || plan.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    {t("paydayDrawer.incomeSplitDate", { defaultValue: "Income Split Date" })}
                  </span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{fmtDate(plan.createdAt)}</span>
                </div>
                {plan.note && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-0.5">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      {t("paydayDrawer.incomeNote", { defaultValue: "Income Note" })}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 italic">{plan.note}</span>
                  </div>
                )}
              </div>
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
              {fmt(plan.totalIncomeAmount)}
            </span>
          </div>

          {/* Waterfall Lines List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Income Split Breakdown ({plan.lines.length} pools)
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
                    {fmt(line.confirmedAmount || line.proposedAmount)}
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
