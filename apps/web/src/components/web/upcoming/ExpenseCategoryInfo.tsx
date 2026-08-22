import React from "react";
import { t } from "@money-matters/i18n";

interface ExpenseCategoryInfoProps {
  categoryName: string;
  currentBalance: number;
  expenseAmount: number;
  healthStatus?: "GREEN" | "AMBER" | "RED" | null;
  isFutureDate: boolean;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExpenseCategoryInfo({
  categoryName,
  currentBalance,
  expenseAmount,
  healthStatus,
  isFutureDate,
}: ExpenseCategoryInfoProps) {
  const projectedBalance = currentBalance - expenseAmount;

  return (
    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          {t("dashboard.upcoming.categoryBalanceDetails")} <strong className="text-zinc-800">{categoryName}</strong>
        </span>
        {isFutureDate && healthStatus && (
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              healthStatus === "GREEN"
                ? "bg-emerald-100 text-emerald-800"
                : healthStatus === "AMBER"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {t("dashboard.upcoming.healthLabel")} {healthStatus === "GREEN" ? t("dashboard.upcoming.healthOnTrack") : healthStatus === "AMBER" ? t("dashboard.upcoming.healthNeedsAttention") : t("dashboard.upcoming.healthBehind")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-white border border-zinc-100 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-bold">{t("dashboard.upcoming.currentBalanceLabel")}</span>
          <span className="font-extrabold text-zinc-800">{fmt(currentBalance)}</span>
        </div>
        <div className="p-2 rounded-lg bg-white border border-zinc-100 flex flex-col">
          <span className="text-[10px] text-zinc-400 font-bold">{t("dashboard.upcoming.projectedAfterLabel")}</span>
          <span className={`font-extrabold ${projectedBalance < 0 ? "text-rose-600" : "text-[#1B2B4B]"}`}>
            {fmt(projectedBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
