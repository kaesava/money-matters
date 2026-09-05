"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";

export interface MissingSchedulesBannerProps {
  incomeCount: number;
  billsCount: number;
}

export function MissingSchedulesBanner({ incomeCount, billsCount }: MissingSchedulesBannerProps) {
  const router = useRouter();

  if (incomeCount > 0 && billsCount > 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 font-extrabold flex items-center justify-center text-lg shrink-0">
          💡
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-amber-900">
            {incomeCount === 0 && billsCount === 0
              ? "Set up your income pay schedule & recurring bills"
              : incomeCount === 0
              ? t("dashboard.missingSchedulesBanner.incomeHint", { defaultValue: "Add your income pay schedule to enable automatic Income Splits" })
              : "Add your bill payment schedule to protect upcoming expenses"}
          </h4>
          <p className="text-[11px] text-amber-800 font-medium mt-0.5">
            Money Matters automatically allocates income into bills, savings, and everyday spending when pay dates are configured.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={() => router.push("/dashboard/income-and-bills")}
          className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs text-center cursor-pointer"
        >
          ➕ Add Schedules Now →
        </button>
      </div>
    </div>
  );
}
