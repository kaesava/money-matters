import React from "react";
import { MonthlyCashFlowPointDTO } from "@money-matters/types";
import { DESIGN_TOKENS } from "../../tokens";
import { t } from "@money-matters/i18n";

interface BarTrendChartProps {
  data: MonthlyCashFlowPointDTO[];
  formatCurrency: (amount: number) => string;
}

export function BarTrendChart({ data, formatCurrency }: BarTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-56">
        <p className="text-xs text-slate-400 font-medium">
          {t("transactions.reporting.cashFlow.empty")}
        </p>
      </div>
    );
  }

  // Display at most 4 recent months
  const recentData = data.slice(-4);
  const maxVal = Math.max(...recentData.map((d) => Math.max(d.income, d.outflow, 100)));

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="h-40 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-slate-100">
        {recentData.map((point) => {
          const inPct = Math.round((point.income / maxVal) * 100);
          const outPct = Math.round((point.outflow / maxVal) * 100);

          return (
            <div key={point.monthKey} className="flex-1 flex flex-col items-center max-w-[70px]">
              <div className="w-full flex items-end justify-center gap-1.5 h-28">
                {/* Income Bar */}
                <div
                  title={`${t("transactions.reporting.cashFlow.inflow")}: ${formatCurrency(point.income)}`}
                  style={{
                    height: `${Math.max(inPct, 4)}%`,
                    backgroundColor: DESIGN_TOKENS.colors.success,
                  }}
                  className="w-3 sm:w-4 rounded-t-sm transition-all hover:opacity-80"
                />
                {/* Outflow Bar */}
                <div
                  title={`${t("transactions.reporting.cashFlow.outflow")}: ${formatCurrency(point.outflow)}`}
                  style={{
                    height: `${Math.max(outPct, 4)}%`,
                    backgroundColor: DESIGN_TOKENS.colors.primary,
                  }}
                  className="w-3 sm:w-4 rounded-t-sm transition-all hover:opacity-80"
                />
              </div>

              <span className="mt-2 text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#22c55e]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.cashFlow.inflow")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#1B2B4B]" />
          <span className="text-slate-600 font-medium">{t("transactions.reporting.cashFlow.outflow")}</span>
        </div>
      </div>
    </div>
  );
}
