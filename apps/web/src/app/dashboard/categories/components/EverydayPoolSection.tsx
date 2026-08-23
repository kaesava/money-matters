"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { useIconVisibility, InfoTooltip } from "@money-matters/ui/web";
import { DualPoolProgressBar } from "./DualPoolProgressBar";

export interface CategorySummaryItem {
  id: string;
  name: string;
  type: "REGULAR" | "GOAL" | "EVERYDAY";
  isPrivate?: boolean | null;
  currentBalance: string;
  monthlyAmount?: string | null;
  everydayAllowanceAmount?: string | null;
  targetAmount?: string | null;
  targetDate?: string | null;
  healthStatus?: string | null;
  isEssential?: boolean | null;
  isSurplusTarget?: boolean | null;
  userId?: string | null;
}

interface EverydayPoolSectionProps {
  categories: CategorySummaryItem[];
  everydayBalance: number;
  everydayMonthlyBudget: number;
  everydayConsumedPct: number;
  elapsedPct: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectCategory?: (id: string) => void;
  onEditCategory: (cat: CategorySummaryItem) => void;
  onOpenActivity?: (cat: CategorySummaryItem) => void;
}

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EverydayPoolSection({
  categories,
  everydayBalance,
  everydayMonthlyBudget,
  everydayConsumedPct,
  elapsedPct,
  isCollapsed,
  onToggleCollapse,
  onSelectCategory: _onSelectCategory,
  onEditCategory,
  onOpenActivity,
}: EverydayPoolSectionProps) {
  const { showIcons } = useIconVisibility();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header Summary Banner */}
      <div className="p-5 bg-gradient-to-r from-teal-50/60 to-white border-b border-zinc-100 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showIcons && (
              <div className="w-10 h-10 rounded-xl bg-[#00B4A6]/10 text-[#00B4A6] flex items-center justify-center text-xl font-bold">
                💳
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.everydayTitle")}</h2>
                <InfoTooltip content="Discretionary funds. Budgets set overall target; spent directly from overall Everyday pool." />
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all flex items-center gap-1 cursor-pointer ml-1"
                >
                  <span>
                    {isCollapsed
                      ? `${categories.length} categor${categories.length === 1 ? "y" : "ies"} ▼`
                      : "Collapse ▲"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Overall Pool Balance</p>
              <p className="text-xl font-mono font-black text-[#1B2B4B]">{fmt(everydayBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monthly Budget Target</p>
              <p className="text-sm font-mono font-bold text-zinc-600">{fmt(everydayMonthlyBudget)}</p>
            </div>
          </div>
        </div>
        <DualPoolProgressBar elapsedPct={elapsedPct} consumedPct={everydayConsumedPct} />
      </div>

      {/* Collapsable Table Content */}
      {!isCollapsed && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3">Category Name</th>
              <th className="px-6 py-3 text-right">Monthly Target Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-xs text-zinc-400 font-medium">
                  No everyday categories matched filters.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className="text-[#00B4A6] hover:underline font-bold text-left cursor-pointer"
                      >
                        {cat.name}
                      </button>
                      {onOpenActivity && (
                        <button
                          type="button"
                          onClick={() => onOpenActivity(cat)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          title="View past transactions and upcoming events for this category"
                        >
                          <span>📊</span>
                          <span>Activity</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono font-bold text-zinc-700 text-right">
                    {fmt(cat.everydayAllowanceAmount || cat.monthlyAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
