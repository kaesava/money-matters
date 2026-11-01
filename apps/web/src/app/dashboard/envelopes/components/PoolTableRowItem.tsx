"use client";

import React from "react";
import Link from "next/link";
import { InfoTooltip, formatRecurrenceLabel } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { PoolTableRow } from "../types";

export interface PoolTableRowItemProps {
  pool: PoolTableRow;
  isProjectionMode?: boolean;
  onOpenCategoryDrawer?: (pool: PoolTableRow) => void;
  onEditPool: (pool: PoolTableRow["rawPool"]) => void;
  fmtMoney: (val: number | null | undefined) => string;
  fmtDate: (val: string | Date | null | undefined) => string;
}

export function PoolTableRowItem({
  pool,
  isProjectionMode = false,
  onOpenCategoryDrawer,
  onEditPool,
  fmtMoney,
  fmtDate,
}: PoolTableRowItemProps) {
  const subTypeBadge =
    pool.envelopeType === "SCHEDULED_BILL"
      ? t("categories.scheduledBillBadge")
      : pool.envelopeType === "FLEXIBLE_BILL"
      ? t("categories.flexibleBillBadge")
      : pool.envelopeType === "TARGET_GOAL"
      ? t("categories.targetDateGoalBadge")
      : pool.envelopeType === "ONGOING_GOAL"
      ? t("categories.ongoingGoalBadge")
      : pool.envelopeType === "EVERYDAY" || pool.poolType === "EVERYDAY"
      ? t("categories.everydayBadge")
      : null;

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group/row">
      {/* Envelope Name & Badges */}
      <td className="py-2.5 px-4 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {isProjectionMode ? (
            <span className="font-bold text-zinc-800 text-left">
              {pool.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (onOpenCategoryDrawer ? onOpenCategoryDrawer(pool) : onEditPool(pool.rawPool))}
              className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
            >
              {pool.name}
            </button>
          )}

          {subTypeBadge && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                pool.envelopeType === "SCHEDULED_BILL"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : pool.envelopeType === "FLEXIBLE_BILL"
                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                  : pool.envelopeType === "TARGET_GOAL"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : pool.envelopeType === "ONGOING_GOAL"
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-purple-50 text-purple-700 border border-purple-200"
              }`}
            >
              {subTypeBadge}
            </span>
          )}

          {pool.rawPool.isSurplusTarget && (
            <span className="inline-flex items-center gap-1">
              <span title={t("categories.targetPoolShortfallSurplus")} className="text-sm cursor-help">
                🎯
              </span>
              <InfoTooltip
                content={t("categories.targetPoolShortfallSurplus")}
              />
            </span>
          )}

          {pool.isPrivate && (
            <span title={t("categories.privateBadge")} className="text-[10px] cursor-help">
              🔒
            </span>
          )}
        </div>
      </td>


      {/* Current Balance */}
      <td className="py-2.5 px-4 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-bold tabular-nums text-zinc-900 text-sm">
            {fmtMoney(pool.currentBalance)}
          </span>
          {(() => {
            if (pool.envelopeType === "TARGET_GOAL") {
              const target = pool.targetAmount || 0;
              const pct = target > 0 ? Math.min(100, Math.round((pool.currentBalance / target) * 100)) : 0;
              return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {pct}%
                </span>
              );
            }
            if (pool.envelopeType === "ONGOING_GOAL") {
              return (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono bg-teal-50 text-teal-700 border border-teal-200">
                  {t("categories.statusActive")}
                </span>
              );
            }
            if (pool.envelopeType === "SCHEDULED_BILL" || pool.envelopeType === "FLEXIBLE_BILL") {
              const isCovered = pool.progressText === t("categories.fullyFunded") || pool.progressText.includes("100%");
              const isPartial = pool.progressText === t("categories.onTrack");
              const label = isCovered
                ? t("categories.statusCovered")
                : isPartial
                ? t("categories.statusPartial")
                : t("categories.statusShortfall");
              return (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    isCovered
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isPartial
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {label}
                </span>
              );
            }
            if (pool.envelopeType === "EVERYDAY") {
              const isOk = pool.currentBalance >= 0;
              return (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    isOk
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isOk ? t("categories.readyToSpend") : t("categories.needsAttention")}
                </span>
              );
            }
            return null;
          })()}
        </div>
      </td>

      {/* Target Amount */}
      <td className="py-2.5 px-4 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-semibold tabular-nums text-zinc-700 text-sm">
            {fmtMoney(pool.targetAmount)}
          </span>
          <span className="text-[11px] font-medium text-zinc-500 font-mono">
            {pool.envelopeType === "TARGET_GOAL" && pool.targetDate
              ? `by ${fmtDate(pool.targetDate)}`
              : pool.envelopeType === "EVERYDAY"
              ? t("categories.frequencyMonthly")
              : pool.rawPool.rrule || pool.rawPool.budgetFrequency
              ? formatRecurrenceLabel(pool.rawPool.rrule, pool.rawPool.budgetFrequency)
              : t("categories.frequencyMonthly")}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
          {pool.hasHistory && (
            <Link
              href={`/dashboard/history?poolId=${pool.id}`}
              className="text-[#2563eb] hover:underline"
            >
              {t("tables.history")}
            </Link>
          )}
          {pool.hasHistory && pool.hasUpcomingExpenses && (
            <span className="text-zinc-300 font-normal">|</span>
          )}
          {pool.hasUpcomingExpenses && (
            <Link
              href={`/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE&poolId=${pool.id}`}
              className="text-[#2563eb] hover:underline"
            >
              {t("tables.expenses")}
            </Link>
          )}
          {!pool.hasHistory && !pool.hasUpcomingExpenses && (
            <span className="text-zinc-400 font-normal">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
