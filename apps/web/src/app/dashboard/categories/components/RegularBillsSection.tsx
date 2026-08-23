"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { useIconVisibility, InfoTooltip } from "@money-matters/ui/web";
import { DualPoolProgressBar } from "./DualPoolProgressBar";
import { CategorySummaryItem } from "./EverydayPoolSection";

interface RegularBillsSectionProps {
  categories: CategorySummaryItem[];
  regularBalance: number;
  regularMonthlyBudget: number;
  regularConsumedPct: number;
  elapsedPct: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectCategory?: (id: string) => void;
  onEditCategory: (cat: CategorySummaryItem) => void;
  onArchiveCategory?: (cat: CategorySummaryItem) => void;
}

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RegularBillsSection({
  categories,
  regularBalance,
  regularMonthlyBudget,
  regularConsumedPct,
  elapsedPct,
  isCollapsed,
  onToggleCollapse,
  onSelectCategory: _onSelectCategory,
  onEditCategory,
  onArchiveCategory: _onArchiveCategory,
}: RegularBillsSectionProps) {
  const { showIcons } = useIconVisibility();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header Summary Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-50/60 to-white border-b border-zinc-100 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showIcons && (
              <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center text-xl font-bold">
                🧾
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.regularTitle")}</h2>
                <InfoTooltip content="Recurring bill obligations. Individual categories set bill targets; managed at overall Bills pool level." />
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
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Overall Bills Pool Balance</p>
              <p className="text-xl font-mono font-black text-[#1B2B4B]">{fmt(regularBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monthly Bills Target</p>
              <p className="text-sm font-mono font-bold text-zinc-600">{fmt(regularMonthlyBudget)}</p>
            </div>
          </div>
        </div>
        <DualPoolProgressBar elapsedPct={elapsedPct} consumedPct={regularConsumedPct} />
      </div>

      {/* Collapsable Table Content */}
      {!isCollapsed && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3">Category Name</th>
              <th className="px-6 py-3 text-right">Monthly Budget Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-6 text-center text-xs text-zinc-400 font-medium">
                  No regular bills matched filters.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                  <td className="px-6 py-3.5">
                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      className="text-[#2563eb] hover:underline font-bold text-left cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  </td>
                  <td className="px-6 py-3.5 font-mono font-bold text-zinc-700 text-right">{fmt(cat.monthlyAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
