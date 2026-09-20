"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { useIconVisibility } from "@money-matters/ui";

export interface MissingSchedulesBannerProps {
  incomeCount: number;
  billsCount: number;
}

export function MissingSchedulesBanner({ incomeCount, billsCount }: MissingSchedulesBannerProps) {
  const router = useRouter();
  const { showIcons } = useIconVisibility();

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
              ? t("dashboard.missingSchedulesBanner.incomeAndBillsHint")
              : incomeCount === 0
              ? t("dashboard.missingSchedulesBanner.incomeHint")
              : t("dashboard.missingSchedulesBanner.billsHint")}
          </h4>
          <p className="text-[11px] text-amber-800 font-medium mt-0.5">
            {t("dashboard.missingSchedulesBanner.description")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={() => router.push("/dashboard/income-and-bills")}
          className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs text-center cursor-pointer"
        >
          {showIcons ? "➕ " : ""}{t("dashboard.missingSchedulesBanner.addSchedulesCta")}
        </button>
      </div>
    </div>
  );
}
