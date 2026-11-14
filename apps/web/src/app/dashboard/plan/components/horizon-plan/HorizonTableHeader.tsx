"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { formatDateShort } from "./formatDateShort";

export interface MatrixColumnItem {
  id: string;
  sourceName: string;
  totalIncome: number;
  dateLabel?: string;
}

export interface HorizonTableHeaderProps {
  visibleColumns: MatrixColumnItem[];
  incomeEvents: Array<{
    id: string;
    expectedDate: string;
    expectedAmount: number;
    actualAmount?: number | null;
    status: "PENDING" | "CONFIRMED";
    sourceName: string;
    isPrivate?: boolean;
  }>;
  columnStateMap: Record<string, "AUTO" | "SAVED" | "CONFIRMED">;
  savingColId: string | null;
  userTimezone: string;
  locale: string;
  returnTo: string;
  fmt: (val: number | string) => string;
  onSaveAutoSplit: (colId: string) => void;
  onResetPlan: (colId: string) => void;
  onRequestDeleteIncome: (colId: string) => void;
}

export function HorizonTableHeader({
  visibleColumns,
  incomeEvents,
  columnStateMap,
  savingColId,
  userTimezone,
  locale,
  returnTo,
  fmt,
  onSaveAutoSplit,
  onResetPlan,
  onRequestDeleteIncome,
}: HorizonTableHeaderProps) {
  const router = useRouter();

  return (
    <thead>
      <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
        <th className="sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-800/90 p-4 font-bold text-[#1B2B4B] dark:text-zinc-200 min-w-[260px] border-r border-zinc-200 dark:border-zinc-700">
          {t("planTabs.matrixTableCategoriesHeader")}
        </th>
        {visibleColumns.map((col) => {
          const incomeEvt = incomeEvents.find((e) => e.id === col.id);
          const colState = columnStateMap[col.id] ?? "AUTO";
          const isConfirmed = colState === "CONFIRMED" || incomeEvt?.status === "CONFIRMED";
          const isSaved = !isConfirmed && colState === "SAVED";

          const dateStr = formatDateShort(
            incomeEvt?.expectedDate,
            col.dateLabel,
            userTimezone,
            locale
          );

          return (
            <th
              key={col.id}
              className={`p-3 text-center border-r border-zinc-200 dark:border-zinc-800 min-w-[170px] transition-colors ${
                isConfirmed
                  ? "bg-emerald-50/50 dark:bg-zinc-800/90"
                  : isSaved
                  ? "bg-slate-100 dark:bg-zinc-800/90"
                  : "bg-zinc-50 dark:bg-zinc-800/80"
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                {/* Row 1: Status Badge on its own row */}
                {isConfirmed ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {t("matrix.confirmedBadge")}
                  </span>
                ) : isSaved ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    {t("matrix.savedBadge")}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {t("matrix.autoBadge")}
                  </span>
                )}

                {/* Row 2: Source Name */}
                <div className="text-sm font-bold text-[#1B2B4B] dark:text-white truncate max-w-[160px] mt-0.5">
                  {col.sourceName}
                </div>

                {/* Row 3: Date */}
                <div className="text-xs text-zinc-500 font-medium">
                  {dateStr}
                </div>

                {/* Row 4: Total Income */}
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  +{fmt(col.totalIncome)}
                </div>

                {/* Row 5: Actions */}
                {isConfirmed ? (
                  <div className="flex items-center justify-center gap-2 text-xs mt-1.5 font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/payday-plan?id=${col.id}&returnTo=${encodeURIComponent(returnTo)}`
                        )
                      }
                      className="font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                      title={t("matrix.review")}
                    >
                      {t("matrix.review")}
                    </button>
                  </div>
                ) : isSaved ? (
                  <div className="flex items-center justify-center gap-2 text-xs mt-1.5 font-medium">
                    <button
                      type="button"
                      onClick={() => onResetPlan(col.id)}
                      className="font-bold text-amber-600 hover:underline cursor-pointer transition-colors"
                      title={t("common.reset")}
                    >
                      {t("common.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/payday-plan?id=${col.id}&returnTo=${encodeURIComponent(returnTo)}`
                        )
                      }
                      className="font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                      title={t("common.edit")}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteIncome(col.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title={t("common.delete")}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs mt-1.5 font-medium">
                    <button
                      type="button"
                      disabled={savingColId === col.id}
                      onClick={() => onSaveAutoSplit(col.id)}
                      className="font-bold text-emerald-600 hover:underline cursor-pointer transition-colors disabled:opacity-50"
                      title={t("common.save")}
                    >
                      {savingColId === col.id ? "..." : t("common.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/payday-plan?id=${col.id}&returnTo=${encodeURIComponent(returnTo)}`
                        )
                      }
                      className="font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors"
                      title={t("common.edit")}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteIncome(col.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title={t("common.delete")}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
