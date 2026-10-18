import React from "react";
import { HorizonBreakdownDTO } from "@money-matters/types";
import { DESIGN_TOKENS } from "../../tokens";
import { t } from "@money-matters/i18n";

interface DonutChartProps {
  data: HorizonBreakdownDTO;
  formatCurrency: (amount: number) => string;
  isFiltered?: boolean;
  filteredSharePercentage?: number;
  centerLabel?: string;
  emptyText?: string;
}

export function DonutChart({
  data,
  formatCurrency,
  isFiltered = false,
  filteredSharePercentage = 100,
  centerLabel,
  emptyText,
}: DonutChartProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  if (data.totalOutflow <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-56">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mb-2" />
        <p className="text-xs text-slate-400 font-medium">
          {emptyText || t("transactions.reporting.donut.empty")}
        </p>
      </div>
    );
  }

  if (isFiltered) {
    return (
      <FilteredDonutView
        radius={radius}
        circumference={circumference}
        totalOutflow={data.totalOutflow}
        sharePercentage={filteredSharePercentage}
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <MacroHorizonDonutView
      radius={radius}
      circumference={circumference}
      data={data}
      formatCurrency={formatCurrency}
      centerLabel={centerLabel}
    />
  );
}

function FilteredDonutView({
  radius,
  circumference,
  totalOutflow,
  sharePercentage,
  formatCurrency,
}: {
  radius: number;
  circumference: number;
  totalOutflow: number;
  sharePercentage: number;
  formatCurrency: (amount: number) => string;
}) {
  const pFiltered = Math.min(Math.max(sharePercentage / 100, 0), 1);
  const lenFiltered = circumference * pFiltered;

  return (
    <div className="flex flex-col items-center justify-between h-full">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          {lenFiltered > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={DESIGN_TOKENS.colors.sereneBlue}
              strokeWidth="12"
              strokeDasharray={`${lenFiltered} ${circumference}`}
              strokeDashoffset={0}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("transactions.reporting.donut.thisFilter")}
          </span>
          <span className="text-sm font-bold font-mono tabular-nums text-slate-800">
            {formatCurrency(totalOutflow)}
          </span>
        </div>
      </div>

      <div className="w-full mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.donut.thisFilter")}</span>
          <span className="font-mono text-slate-400">({sharePercentage}%)</span>
        </div>
      </div>
    </div>
  );
}

function MacroHorizonDonutView({
  radius,
  circumference,
  data,
  formatCurrency,
  centerLabel,
}: {
  radius: number;
  circumference: number;
  data: HorizonBreakdownDTO;
  formatCurrency: (amount: number) => string;
  centerLabel?: string;
}) {
  const pEveryday = data.percentages.everyday / 100;
  const pBills = data.percentages.bills / 100;
  const pGoals = data.percentages.goals / 100;

  const lenEveryday = circumference * pEveryday;
  const lenBills = circumference * pBills;
  const lenGoals = circumference * pGoals;

  return (
    <div className="flex flex-col items-center justify-between h-full">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          {lenEveryday > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={DESIGN_TOKENS.colors.sereneBlue}
              strokeWidth="12"
              strokeDasharray={`${lenEveryday} ${circumference}`}
              strokeDashoffset={0}
            />
          )}
          {lenBills > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={DESIGN_TOKENS.colors.primary}
              strokeWidth="12"
              strokeDasharray={`${lenBills} ${circumference}`}
              strokeDashoffset={-lenEveryday}
            />
          )}
          {lenGoals > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={DESIGN_TOKENS.colors.success}
              strokeWidth="12"
              strokeDasharray={`${lenGoals} ${circumference}`}
              strokeDashoffset={-(lenEveryday + lenBills)}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {centerLabel || t("transactions.reporting.donut.totalOutflow")}
          </span>
          <span className="text-sm font-bold font-mono tabular-nums text-slate-800">
            {formatCurrency(data.totalOutflow)}
          </span>
        </div>
      </div>

      <div className="w-full mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.donut.everyday")}</span>
          <span className="font-mono text-slate-400">({data.percentages.everyday}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1B2B4B]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.donut.bills")}</span>
          <span className="font-mono text-slate-400">({data.percentages.bills}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.donut.goals")}</span>
          <span className="font-mono text-slate-400">({data.percentages.goals}%)</span>
        </div>
      </div>
    </div>
  );
}
