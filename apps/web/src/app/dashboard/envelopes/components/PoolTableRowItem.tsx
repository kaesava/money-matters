"use client";

import React from "react";
import Link from "next/link";
import { InfoTooltip } from "@money-matters/ui/web";
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
  const isGoal = pool.poolType === "GOAL";

  const subTypeBadge =
    pool.envelopeType === "SCHEDULED_BILL"
      ? t("categories.scheduledBillBadge")
      : pool.envelopeType === "FLEXIBLE_BILL"
      ? t("categories.flexibleBillBadge")
      : pool.envelopeType === "TARGET_GOAL"
      ? t("categories.targetDateGoalBadge")
      : pool.envelopeType === "ONGOING_GOAL"
      ? t("categories.ongoingGoalBadge")
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
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : pool.envelopeType === "TARGET_GOAL"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-teal-50 text-teal-700 border border-teal-200"
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

      {/* Bank Account */}
      <td className="py-2.5 px-4 text-left">
        {pool.bankAccountName ? (
          <Link
            href={
              pool.bankAccountId
                ? `/dashboard/settings?tab=bank-accounts&id=${pool.bankAccountId}`
                : `/dashboard/settings?tab=bank-accounts`
            }
            className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1"
          >
            <span>{pool.bankAccountName}</span>
            <span className="text-xs">↗</span>
          </Link>
        ) : (
          <span className="text-zinc-400 font-medium">—</span>
        )}
      </td>

      {/* Current Balance */}
      <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-zinc-900">
        {fmtMoney(pool.currentBalance)}
      </td>

      {/* Target Amount */}
      <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-zinc-600">
        {fmtMoney(pool.targetAmount)}
      </td>

      {/* Progress Status */}
      <td className="py-2.5 px-4 text-center">
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              pool.progressText.includes("On Track") ||
              pool.progressText.includes("Ready") ||
              pool.progressText.includes("100%") ||
              pool.progressText.includes("Fully")
                ? "bg-emerald-100 text-emerald-800"
                : pool.progressText.includes("Risk") || pool.progressText.includes("Needs")
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {pool.progressText}
          </span>
          {isGoal && pool.targetDate && (
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 font-mono">
              {fmtDate(pool.targetDate)}
            </span>
          )}
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
