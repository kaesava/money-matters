"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { useIconVisibility, InfoTooltip, fmtDate, useResizableColumns, ResizableTh } from "@money-matters/ui/web";
import { DualPoolProgressBar } from "./DualPoolProgressBar";
import { CategorySummaryItem } from "./EverydayPoolSection";

import { BillCoverageItem } from "@money-matters/types";

interface RegularBillsSectionProps {
  categories: CategorySummaryItem[];
  billCoverageItems?: BillCoverageItem[];
  regularBalance: number;
  regularMonthlyBudget: number;
  regularConsumedPct: number;
  elapsedPct: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectCategory?: (id: string) => void;
  onEditCategory: (cat: CategorySummaryItem) => void;
  onArchiveCategory?: (cat: CategorySummaryItem) => void;
  onOpenActivity?: (cat: CategorySummaryItem) => void;
}

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RegularBillsSection({
  categories,
  billCoverageItems = [],
  regularBalance,
  regularMonthlyBudget,
  regularConsumedPct,
  elapsedPct,
  isCollapsed,
  onToggleCollapse,
  onSelectCategory: _onSelectCategory,
  onEditCategory,
  onArchiveCategory: _onArchiveCategory,
  onOpenActivity,
}: RegularBillsSectionProps) {
  const { showIcons } = useIconVisibility();
  const coverageMap = new Map(billCoverageItems.map((item) => [item.categoryId, item]));
  const { widths, onMouseDown } = useResizableColumns({
    name: 240,
    dueDate: 200,
    coverage: 180,
    target: 180,
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header Summary Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-50/60 to-white border-b border-zinc-100 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showIcons && (
              <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center text-xl font-bold">
                🗓️
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#1B2B4B]">{t("categories.sections.regularTitle")}</h2>
                <InfoTooltip content="Committed obligations. Sub-categories show due dates; spent directly from overall Bills pool." />
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
              <p className="text-xl font-mono font-black text-[#1B2B4B]">{fmt(regularBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Monthly Budget Target</p>
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
              <ResizableTh width={widths.name} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("name", e)} className="px-6 py-3">Category Name</ResizableTh>
              <ResizableTh width={widths.dueDate} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("dueDate", e)} className="px-6 py-3 text-center">Next Due Date</ResizableTh>
              <ResizableTh width={widths.coverage} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("coverage", e)} className="px-6 py-3 text-center">Upcoming Coverage</ResizableTh>
              <ResizableTh width={widths.target} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("target", e)} className="px-6 py-3 text-right">Monthly Target Budget</ResizableTh>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-xs text-zinc-400 font-medium">
                  No bill categories matched filters.
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const cov = coverageMap.get(cat.id);
                return (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditCategory(cat)}
                          className="text-[#2563eb] hover:underline font-bold text-left cursor-pointer"
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
                    <td className="px-6 py-3.5 font-mono text-zinc-600 text-center">

                      {cov && cov.nextDueDate ? (
                        <span>
                          {fmtDate(cov.nextDueDate)} ({fmt(cov.nextDueAmount)})
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">{t("categories.sections.billCoverageNoUpcoming")}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {cov?.coverageStatus === "COVERED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 inline-block">
                          {t("categories.sections.billCoverageStatusCovered")}
                        </span>
                      )}
                      {cov?.coverageStatus === "SHORT_BY" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 inline-block">
                          {t("categories.sections.billCoverageStatusShort", {
                            amount: cov.shortfallAmount ? fmt(cov.shortfallAmount) : "",
                          })}
                        </span>
                      )}
                      {(cov?.coverageStatus === "NO_SCHEDULE" || !cov) && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 inline-block">
                          {t("categories.sections.billCoverageStatusNoSchedule")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-zinc-700 text-right">{fmt(cat.monthlyAmount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

