"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { formatCurrency } from "@money-matters/ui/web";

interface SetupReviewSummaryCardsProps {
  totalMonthlyIncomeAud: number;
  totalAllocatedMonthly: number;
  netSurplus: number;
}

export function SetupReviewSummaryCards({
  totalMonthlyIncomeAud,
  totalAllocatedMonthly,
  netSurplus,
}: SetupReviewSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase text-blue-700">
          {t("setup.reviewSummary.monthlyNetIncome")}
        </span>
        <span className="text-lg font-black text-[#1B2B4B] font-mono">
          {formatCurrency(totalMonthlyIncomeAud)}
        </span>
      </div>
      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase text-emerald-700">
          {t("setup.reviewSummary.totalAllocated")}
        </span>
        <span className="text-lg font-black text-[#1B2B4B] font-mono">
          {formatCurrency(totalAllocatedMonthly)}
        </span>
      </div>
      <div
        className={`p-3.5 rounded-2xl border flex flex-col gap-1 ${
          netSurplus >= 0
            ? "bg-teal-50/70 border-teal-200/80 text-teal-700"
            : "bg-red-50/70 border-red-200/80 text-red-700"
        }`}
      >
        <span className="text-[10px] font-black uppercase">
          {netSurplus >= 0
            ? t("setup.reviewSummary.estimatedMonthlyExtra")
            : t("setup.reviewSummary.estimatedMonthlyShortfall")}
        </span>
        <span className="text-lg font-black text-[#1B2B4B] font-mono">
          {formatCurrency(Math.abs(netSurplus))}
        </span>
      </div>
    </div>
  );
}
