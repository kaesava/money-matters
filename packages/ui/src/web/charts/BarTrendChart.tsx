import React from "react";
import { MonthlyCashFlowPointDTO } from "@money-matters/types";
import { DESIGN_TOKENS } from "../../tokens";
import { t } from "@money-matters/i18n";

interface BarTrendChartProps {
  data: MonthlyCashFlowPointDTO[];
  formatCurrency: (amount: number) => string;
  isFiltered?: boolean;
  inflowLabel?: string;
  outflowLabel?: string;
  emptyText?: string;
}

export function BarTrendChart({
  data,
  formatCurrency,
  isFiltered = false,
  inflowLabel,
  outflowLabel,
  emptyText,
}: BarTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-56">
        <p className="text-xs text-slate-400 font-medium">
          {emptyText || t("transactions.reporting.cashFlow.empty")}
        </p>
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => (isFiltered ? d.outflow : Math.max(d.income, d.outflow, 50))),
    50
  );
  const isCompact = data.length > 6;

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="h-40 flex items-end justify-between gap-1 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
        {data.map((point) => (
          <BarPointItem
            key={point.monthKey}
            point={point}
            maxVal={maxVal}
            isCompact={isCompact}
            isFiltered={isFiltered}
            formatCurrency={formatCurrency}
            inflowLabel={inflowLabel}
            outflowLabel={outflowLabel}
          />
        ))}
      </div>

      <ChartLegend
        isFiltered={isFiltered}
        inflowLabel={inflowLabel}
        outflowLabel={outflowLabel}
      />
    </div>
  );
}

interface BarPointItemProps {
  point: MonthlyCashFlowPointDTO;
  maxVal: number;
  isCompact: boolean;
  isFiltered: boolean;
  formatCurrency: (amount: number) => string;
  inflowLabel?: string;
  outflowLabel?: string;
}

function BarPointItem({
  point,
  maxVal,
  isCompact,
  isFiltered,
  formatCurrency,
  inflowLabel,
  outflowLabel,
}: BarPointItemProps) {
  const inPct = Math.round((point.income / maxVal) * 100);
  const outPct = Math.round((point.outflow / maxVal) * 100);
  const inTitle = `${inflowLabel || t("transactions.reporting.cashFlow.inflow")}: ${formatCurrency(point.income)}`;
  const outTitle = `${isFiltered ? t("transactions.reporting.donut.thisFilter") : (outflowLabel || t("transactions.reporting.cashFlow.outflow"))}: ${formatCurrency(point.outflow)}`;

  return (
    <div className="flex-1 flex flex-col items-center min-w-[20px] max-w-[55px]">
      <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-28">
        {!isFiltered && (
          <div
            title={inTitle}
            style={{
              height: `${Math.max(inPct, 4)}%`,
              backgroundColor: DESIGN_TOKENS.colors.success,
            }}
            className={`${isCompact ? "w-1.5 sm:w-2" : "w-3 sm:w-4"} rounded-t-xs transition-all hover:opacity-80`}
          />
        )}
        <div
          title={outTitle}
          style={{
            height: `${Math.max(outPct, 4)}%`,
            backgroundColor: DESIGN_TOKENS.colors.primary,
          }}
          className={`${isCompact ? "w-1.5 sm:w-2" : "w-3 sm:w-4"} rounded-t-xs transition-all hover:opacity-80`}
        />
      </div>
      <span className="mt-2 text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate max-w-full">
        {point.label}
      </span>
    </div>
  );
}

function ChartLegend({
  isFiltered,
  inflowLabel,
  outflowLabel,
}: {
  isFiltered: boolean;
  inflowLabel?: string;
  outflowLabel?: string;
}) {
  if (isFiltered) {
    return (
      <div className="w-full mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.donut.thisFilter")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 flex items-center justify-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-xs bg-[#22c55e]" />
        <span className="text-slate-600 font-medium">{inflowLabel || t("transactions.reporting.cashFlow.inflow")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb]" />
        <span className="text-slate-600 font-medium">{outflowLabel || t("transactions.reporting.cashFlow.outflow")}</span>
      </div>
    </div>
  );
}

