"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ResizableTh, PaginationBar, SkeletonTable, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { PoolTableRow } from "../types";

export interface PoolsTableProps {
  pools: PoolTableRow[];
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  sortField: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate";
  sortDir: "asc" | "desc";
  toggleSort: (field: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate") => void;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onEditPool: (pool: PoolTableRow["rawPool"]) => void;
  onOpenCategoryDrawer?: (pool: PoolTableRow) => void;
  onAddPool?: (poolType?: "EVERYDAY" | "REGULAR" | "GOAL") => void;
  fmtMoney: (val: number | null | undefined) => string;
  isLoading?: boolean;
  searchQuery?: string;
  typeFilter?: "ALL" | "EVERYDAY" | "REGULAR" | "GOAL";
  isProjectionMode?: boolean;
}

const getPoolTypeLabels = (): Record<"EVERYDAY" | "REGULAR" | "GOAL", string> => ({
  EVERYDAY: t("categories.everydayEnvelopesUpper"),
  REGULAR: t("categories.billsEnvelopesUpper"),
  GOAL: t("categories.goalsUpper"),
});

export function PoolsTable({
  pools,
  page,
  totalPages,
  pageSize,
  totalItems,
  sortField,
  sortDir,
  toggleSort,
  onPageChange,
  onPageSizeChange,
  onEditPool,
  onOpenCategoryDrawer,
  onAddPool,
  fmtMoney,
  isLoading = false,
  searchQuery = "",
  typeFilter = "ALL",
  isProjectionMode = false,
}: PoolsTableProps) {
  const { fmtDate } = useLocale();
  const [widths, setWidths] = useState({
    name: 300,
    bankAccount: 180,
    balance: 140,
    target: 140,
    progress: 150,
    actions: 100,
  });

  // Level 1: Pool Types (expanded by default)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    EVERYDAY: true,
    REGULAR: true,
    GOAL: true,
  });

  // Auto expand when search query is active
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedTypes({ EVERYDAY: true, REGULAR: true, GOAL: true });
    }
  }, [searchQuery]);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const onMouseDown = (col: keyof typeof widths, e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = widths[col];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setWidths((prev) => ({
        ...prev,
        [col]: Math.max(80, startWidth + delta),
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Group pools by type (filtered to active typeFilter if not "ALL")
  const poolTypes: Array<"EVERYDAY" | "REGULAR" | "GOAL"> =
    typeFilter && typeFilter !== "ALL"
      ? [typeFilter]
      : ["EVERYDAY", "REGULAR", "GOAL"];

  const groupedPools = poolTypes
    .map((type) => {
      const items = pools.filter((p) => p.poolType === type);
      const totalBalance = items.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
      const totalTarget = items.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
      return {
        type,
        label: getPoolTypeLabels()[type],
        items,
        totalBalance,
        totalTarget,
      };
    })
    .filter((g) => g.items.length > 0);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <SkeletonTable cols={6} rows={6} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
              {/* Pools & Categories */}
              <ResizableTh
                width={widths.name}
                onResizeMouseDown={(e) => onMouseDown("name", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>{t("categories.title")}</span>
                  {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Bank Account */}
              <ResizableTh
                width={widths.bankAccount}
                onResizeMouseDown={(e) => onMouseDown("bankAccount", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left"
                onClick={() => toggleSort("bankAccountName")}
              >
                <div className="flex items-center gap-1">
                  <span>{t("tables.bankAccount")}</span>
                  {sortField === "bankAccountName" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Current Balance */}
              <ResizableTh
                width={widths.balance}
                onResizeMouseDown={(e) => onMouseDown("balance", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("currentBalance")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("tables.currentBalance")}</span>
                  {sortField === "currentBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Target */}
              <ResizableTh
                width={widths.target}
                onResizeMouseDown={(e) => onMouseDown("target", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("targetAmount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("tables.target")}</span>
                  {sortField === "targetAmount" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Progress */}
              <ResizableTh
                width={widths.progress}
                onResizeMouseDown={(e) => onMouseDown("progress", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>{t("tables.progress")}</span>
              </ResizableTh>

              {/* Actions */}
              <ResizableTh
                width={widths.actions}
                onResizeMouseDown={(e) => onMouseDown("actions", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>{t("tables.actions")}</span>
              </ResizableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {isLoading ? (
              <tr className="animate-pulse">
                <td colSpan={6} className="p-0">
                  <SkeletonTable cols={6} rows={pageSize} />
                </td>
              </tr>
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                  {t("categories.noEnvelopesFound")}
                </td>
              </tr>
            ) : (
              groupedPools.map((group) => {
                const isTypeExpanded = Boolean(expandedTypes[group.type]);

                return (
                  <React.Fragment key={group.type}>
                    {/* LEVEL 1: POOL TYPE HEADER ROW */}
                    <tr className="bg-slate-100/80 hover:bg-slate-100 font-bold border-t border-b border-zinc-200 text-zinc-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleType(group.type)}
                            className="p-1 hover:bg-slate-200 rounded text-zinc-500 font-extrabold cursor-pointer"
                          >
                            {isTypeExpanded ? "▼" : "▶"}
                          </button>
                          <span className="text-xs font-black uppercase tracking-wide text-[#1B2B4B]">
                            {group.label} ({group.items.length})
                          </span>
                          {onAddPool && !isProjectionMode && group.type !== "EVERYDAY" && (
                            <button
                              type="button"
                              onClick={() => onAddPool(group.type)}
                              className="px-1.5 py-0.5 text-[10px] font-black bg-[#2563eb] hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                              title={
                                group.type === "REGULAR"
                                  ? t("categories.createBillEnvelopeTooltip")
                                  : t("categories.createGoalEnvelopeTooltip")
                              }
                              aria-label={
                                group.type === "REGULAR"
                                  ? t("categories.createBillEnvelopeTooltip")
                                  : t("categories.createGoalEnvelopeTooltip")
                              }
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-center">—</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#1B2B4B]">
                        {fmtMoney(group.totalBalance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-zinc-700">
                        {fmtMoney(group.totalTarget)}
                      </td>
                      <td className="py-3 px-4 text-center">—</td>
                      <td className="py-3 px-4 text-center">—</td>
                    </tr>

                    {/* LEVEL 2: POOL ROWS */}
                    {isTypeExpanded &&
                      group.items.map((pool) => {
                        const isGoal = pool.poolType === "GOAL";

                        const subTypeBadge = pool.envelopeType === "SCHEDULED_BILL"
                          ? t("categories.scheduledBillBadge")
                          : pool.envelopeType === "FLEXIBLE_BILL"
                          ? t("categories.flexibleBillBadge")
                          : pool.envelopeType === "TARGET_GOAL"
                          ? t("categories.targetDateGoalBadge")
                          : pool.envelopeType === "ONGOING_GOAL"
                          ? t("categories.ongoingGoalBadge")
                          : null;

                        return (
                          <React.Fragment key={pool.id}>
                            <tr className="hover:bg-slate-50/80 transition-colors group/row">
                              {/* Envelope Name & Badges */}
                              <td className="py-2.5 px-4 pl-6">
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
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                                      pool.envelopeType === "SCHEDULED_BILL"
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : pool.envelopeType === "FLEXIBLE_BILL"
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : pool.envelopeType === "TARGET_GOAL"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-teal-50 text-teal-700 border border-teal-200"
                                    }`}>
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
                                    href={pool.bankAccountId ? `/dashboard/settings?tab=bank-accounts&id=${pool.bankAccountId}` : `/dashboard/settings?tab=bank-accounts`}
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
                                      pool.progressText.includes("On Track") || pool.progressText.includes("Ready") || pool.progressText.includes("100%") || pool.progressText.includes("Fully")
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
                                    >{t("tables.history")}</Link>
                                  )}
                                  {pool.hasHistory && pool.hasUpcomingExpenses && (
                                    <span className="text-zinc-300 font-normal">|</span>
                                  )}
                                  {pool.hasUpcomingExpenses && (
                                    <Link
                                      href={`/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE&poolId=${pool.id}`}
                                      className="text-[#2563eb] hover:underline"
                                    >{t("tables.expenses")}</Link>
                                  )}
                                  {!pool.hasHistory && !pool.hasUpcomingExpenses && (
                                    <span className="text-zinc-400 font-normal">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalItems >= 5 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
