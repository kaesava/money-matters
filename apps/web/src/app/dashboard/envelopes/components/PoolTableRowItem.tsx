import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { InfoTooltip, formatRecurrenceLabel } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { MoreVertical, Edit2, History, Receipt, ArrowDownCircle } from "lucide-react";
import { useAppFeatures } from "../../../../hooks/useAppFeatures";
import { PoolTableRow } from "../types";

export interface PoolTableRowItemProps {
  pool: PoolTableRow;
  isProjectionMode?: boolean;
  onOpenCategoryDrawer?: (pool: PoolTableRow) => void;
  onEditPool: (pool: PoolTableRow["rawPool"]) => void;
  onDrawDown?: (pool: PoolTableRow["rawPool"]) => void;
  fmtMoney: (val: number | null | undefined) => string;
  fmtDate: (val: string | Date | null | undefined) => string;
}

export function PoolTableRowItem({
  pool,
  isProjectionMode = false,
  onOpenCategoryDrawer,
  onEditPool,
  onDrawDown,
  fmtMoney,
  fmtDate,
}: PoolTableRowItemProps) {
  const { hasPrivateMode } = useAppFeatures();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);
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

          {Boolean(pool.isEssential || pool.rawPool.isEssential) && (pool.envelopeType === "SCHEDULED_BILL" || pool.envelopeType === "FLEXIBLE_BILL") && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
              {t("categories.essentialBadge")}
            </span>
          )}

          {Boolean(pool.isCommitted || pool.rawPool.isCommitted) && (pool.envelopeType === "TARGET_GOAL" || pool.envelopeType === "ONGOING_GOAL") && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              {t("categories.committedBadge")}
            </span>
          )}

          {pool.rawPool.isSurplusTarget && (
            <span className="inline-flex items-center gap-1">
              <span className="text-sm">
                🎯
              </span>
              <InfoTooltip
                content={t("categories.targetPoolShortfallSurplus")}
              />
            </span>
          )}

          {hasPrivateMode && pool.isPrivate && (
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
            if (pool.balanceStatus) {
              const label =
                pool.balanceStatus === "INACTIVE"
                  ? t("categories.statusInactive")
                  : pool.balanceStatus === "COVERED"
                  ? t("categories.statusCovered")
                  : pool.balanceStatus === "ON_TRACK"
                  ? t("categories.statusOnTrack")
                  : pool.balanceStatus === "PARTIAL"
                  ? t("categories.statusPartial")
                  : t("categories.statusShortfall");
              const style =
                pool.balanceStatus === "INACTIVE"
                  ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  : pool.balanceStatus === "COVERED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : pool.balanceStatus === "ON_TRACK"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : pool.balanceStatus === "PARTIAL"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200";
              return (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${style}`}>
                  {label}
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
              ? t("categories.targetByDate", { date: fmtDate(pool.targetDate) })
              : pool.envelopeType === "EVERYDAY"
              ? t("categories.frequencyMonthly")
              : pool.rawPool.rrule || pool.rawPool.budgetFrequency
              ? formatRecurrenceLabel(pool.rawPool.rrule, pool.rawPool.budgetFrequency)
              : t("categories.frequencyMonthly")}
          </span>
        </div>
      </td>

      {/* Actions: Clean 3-dots Menu */}
      <td className="py-2.5 px-4 text-center">
        {isProjectionMode ? (
          <span className="text-zinc-300 dark:text-zinc-600 text-xs select-none">—</span>
        ) : (
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              aria-label={t("common.manage")}
              title={t("common.manage")}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                {onDrawDown && pool.envelopeType !== "EVERYDAY" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDrawDown(pool.rawPool);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("categories.actions.drawDown")}</span>
                  </button>
                )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEditPool(pool.rawPool);
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("common.edit")}</span>
              </button>

              {pool.hasHistory && (
                <Link
                  href={`/dashboard/history?poolId=${pool.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("tables.history")}</span>
                </Link>
              )}

              {pool.hasUpcomingExpenses && (
                <Link
                  href={`/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE&poolId=${pool.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("tables.expenses")}</span>
                </Link>
              )}
            </div>
          )}
        </div>
        )}
      </td>
    </tr>
  );
}
