"use client";

import React from "react";
import { ShieldCheck, Target, ShoppingBag, Wallet } from "lucide-react";
import { t } from "@money-matters/i18n";

export interface PaydayMetricsGridProps {
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isDeficit: boolean;
  formatAUD: (amount: number) => string;
}

export function PaydayMetricsGrid({
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isDeficit,
  formatAUD,
}: PaydayMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 border-t border-white/10">
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-teal-200/80 uppercase tracking-wider block">
            {t("paydayDrawer.everydaySpending")}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-white tabular-nums">
            {formatAUD(everydayAllocated)}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-blue-200/80 uppercase tracking-wider block">
            {t("paydayDrawer.ringFencedBills")}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-white tabular-nums">
            {formatAUD(billsAllocated)}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-indigo-200/80 uppercase tracking-wider block">
            {t("paydayDrawer.fundedGoals")}
          </span>
          <span className="font-mono text-base sm:text-lg font-black text-white tabular-nums">
            {formatAUD(goalsAllocated)}
          </span>
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
        isDeficit
          ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
          : "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isDeficit
            ? "bg-rose-500/30 text-rose-300 border border-rose-400/40"
            : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
        }`}>
          <Wallet className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${
            isDeficit ? "text-rose-200" : "text-emerald-200"
          }`}>
            {isDeficit ? t("paydayDrawer.metricDeficit") : t("paydayDrawer.metricSurplus")}
          </span>
          <span className={`font-mono text-base sm:text-lg font-black tabular-nums ${
            isDeficit ? "text-rose-300" : "text-white"
          }`}>
            {formatAUD(safeToSpend)}
          </span>
        </div>
      </div>
    </div>
  );
}
