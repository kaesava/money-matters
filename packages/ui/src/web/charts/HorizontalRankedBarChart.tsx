import React from "react";
import { TopOutflowPoolDTO } from "@money-matters/types";
import { DESIGN_TOKENS } from "../../tokens";
import { t } from "@money-matters/i18n";

interface HorizontalRankedBarChartProps {
  topPools: TopOutflowPoolDTO[];
  otherPoolsAmount: number;
  totalOutflow: number;
  formatCurrency: (amount: number) => string;
}

export function HorizontalRankedBarChart({
  topPools,
  otherPoolsAmount,
  totalOutflow,
  formatCurrency,
}: HorizontalRankedBarChartProps) {
  if (topPools.length === 0 || totalOutflow <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-56">
        <p className="text-xs text-slate-400 font-medium">
          {t("transactions.reporting.topPools.empty")}
        </p>
      </div>
    );
  }

  const otherPercentage =
    totalOutflow > 0 ? Math.round((otherPoolsAmount / totalOutflow) * 10000) / 100 : 0;

  return (
    <div className="flex flex-col justify-center space-y-2.5 h-full py-1">
      {topPools.slice(0, 4).map((pool, idx) => (
        <div key={pool.id || idx} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 truncate max-w-[130px]">
              {pool.name}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
              <span className="text-slate-800 font-semibold">{formatCurrency(pool.amount)}</span>
              <span className="text-slate-400">({pool.percentage}%)</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(Math.max(pool.percentage, 3), 100)}%`,
                backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>
      ))}

      {otherPoolsAmount > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 truncate max-w-[130px]">
              {t("transactions.reporting.topPools.otherPools")}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
              <span className="text-slate-600 font-medium">{formatCurrency(otherPoolsAmount)}</span>
              <span className="text-slate-400">({otherPercentage}%)</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(Math.max(otherPercentage, 3), 100)}%`,
                backgroundColor: DESIGN_TOKENS.colors.slate[400],
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
