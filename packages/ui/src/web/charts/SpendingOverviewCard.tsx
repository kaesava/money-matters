"use client";

import React, { useState } from "react";
import { SpendingAnalyticsDTO, SpendingTimeframe } from "@money-matters/types";
import { DonutChart } from "./DonutChart";
import { BarTrendChart } from "./BarTrendChart";
import { HorizontalRankedBarChart } from "./HorizontalRankedBarChart";
import { t } from "@money-matters/i18n";
import { ChevronDown, ChevronUp, BarChart3, Info } from "lucide-react";

export interface SpendingOverviewCardLabels {
  overviewTitle?: string;
  overviewSubtitle?: string;
  filteredOverviewTitle?: string;
  filteredOverviewSubtitle?: string;
  donutTitle?: string;
  filteredDonutTitle?: string;
  cashFlowTitle?: string;
  filteredCashFlowTitle?: string;
  topPoolsTitle?: string;
  filteredTopPoolsTitle?: string;
  centerLabel?: string;
  inflowLegend?: string;
  outflowLegend?: string;
  emptyText?: string;
}

interface SpendingOverviewCardProps {
  analytics: SpendingAnalyticsDTO | undefined;
  isLoading: boolean;
  timeframe: SpendingTimeframe;
  onTimeframeChange: (timeframe: SpendingTimeframe) => void;
  formatCurrency: (amount: number) => string;
  labels?: SpendingOverviewCardLabels;
  showPayeesWhenFiltered?: boolean;
}

export function SpendingOverviewCard({
  analytics,
  isLoading,
  timeframe,
  onTimeframeChange,
  formatCurrency,
  labels,
  showPayeesWhenFiltered = true,
}: SpendingOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const timeframes: Array<{ key: SpendingTimeframe; label: string }> = [
    { key: "30D", label: t("transactions.reporting.timeframe.d30") },
    { key: "90D", label: t("transactions.reporting.timeframe.d90") },
    { key: "1Y", label: t("transactions.reporting.timeframe.y1") },
  ];

  const isFiltered = Boolean(analytics?.isFiltered);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden mb-6">
      {/* Header bar */}
      <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {isFiltered
                ? (labels?.filteredOverviewTitle || t("transactions.reporting.filteredOverviewTitle"))
                : (labels?.overviewTitle || t("transactions.reporting.overviewTitle"))}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {isFiltered
                ? (labels?.filteredOverviewSubtitle || t("transactions.reporting.filteredOverviewSubtitle"))
                : (labels?.overviewSubtitle || t("transactions.reporting.overviewSubtitle"))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-zinc-200 shadow-xs">
            {timeframes.map((tf) => (
              <button
                key={tf.key}
                type="button"
                onClick={() => onTimeframeChange(tf.key)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  timeframe === tf.key
                    ? "bg-[#2563eb] text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-semibold"
            aria-label={isExpanded ? t("transactions.reporting.toggleHide") : t("transactions.reporting.toggleShow")}
          >
            {isExpanded ? (
              <>
                <span className="hidden sm:inline">{t("transactions.reporting.toggleHide")}</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{t("transactions.reporting.toggleShow")}</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body content */}
      {isExpanded && (
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              <div className="h-56 bg-slate-100 rounded-xl" />
              <div className="h-56 bg-slate-100 rounded-xl" />
              <div className="h-56 bg-slate-100 rounded-xl" />
            </div>
          ) : analytics?.isTransferOnly ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3 text-xs text-slate-600">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <p>{t("transactions.reporting.transfersNotice")}</p>
            </div>
          ) : !analytics || analytics.isEmpty ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              {labels?.emptyText || t("transactions.reporting.donut.empty")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chart 1 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-3">
                  {isFiltered
                    ? (labels?.filteredDonutTitle || t("transactions.reporting.donut.filteredTitle"))
                    : (labels?.donutTitle || t("transactions.reporting.donut.title"))}
                </span>
                <DonutChart
                  data={analytics.horizonBreakdown}
                  formatCurrency={formatCurrency}
                  isFiltered={isFiltered}
                  filteredSharePercentage={analytics.filteredSharePercentage}
                  centerLabel={labels?.centerLabel}
                  emptyText={labels?.emptyText}
                />
              </div>

              {/* Chart 2 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-3">
                  {isFiltered
                    ? (labels?.filteredCashFlowTitle || t("transactions.reporting.cashFlow.filteredTitle"))
                    : (labels?.cashFlowTitle || t("transactions.reporting.cashFlow.title"))}
                </span>
                <BarTrendChart
                  data={analytics.monthlyCashFlow}
                  formatCurrency={formatCurrency}
                  isFiltered={isFiltered}
                  inflowLabel={labels?.inflowLegend}
                  outflowLabel={labels?.outflowLegend}
                  emptyText={labels?.emptyText}
                />
              </div>

              {/* Chart 3 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight mb-3">
                  {isFiltered
                    ? (labels?.filteredTopPoolsTitle || t("transactions.reporting.topPools.filteredTitle"))
                    : (labels?.topPoolsTitle || t("transactions.reporting.topPools.title"))}
                </span>
                <HorizontalRankedBarChart
                  topPools={analytics.topPools}
                  otherPoolsAmount={analytics.otherPoolsAmount}
                  totalOutflow={analytics.totalOutflow}
                  formatCurrency={formatCurrency}
                  isFiltered={isFiltered}
                  topPayees={analytics.topPayees}
                  showPayeesWhenFiltered={showPayeesWhenFiltered}
                  emptyText={labels?.emptyText}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
