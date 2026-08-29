import React from "react";
import { t } from "@money-matters/i18n";

interface DashboardMetricsCardsProps {
  summary: {
    totalIncome?: string;
    totalSpent?: string;
    totalSaved?: string;
    everydayRemaining?: string;
  } | undefined;
  fmt: (val: string | number) => string;
}

export function DashboardMetricsCards({ summary, fmt }: DashboardMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{t("dashboard.metrics.totalIncome")}</span>
        <span className="text-xl font-black text-[#1B2B4B]">{fmt(summary?.totalIncome || "0.00")}</span>
      </div>
      <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{t("dashboard.metrics.totalSpent")}</span>
        <span className="text-xl font-black text-rose-600">{fmt(summary?.totalSpent || "0.00")}</span>
      </div>
      <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{t("dashboard.metrics.totalSaved")}</span>
        <span className="text-xl font-black text-[#00B4A6]">{fmt(summary?.totalSaved || "0.00")}</span>
      </div>
      <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-sm flex flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{t("dashboard.metrics.everydayBalance")}</span>
        <span className="text-xl font-black text-[#1B2B4B]">{fmt(summary?.everydayRemaining || "0.00")}</span>
      </div>
    </div>
  );
}
