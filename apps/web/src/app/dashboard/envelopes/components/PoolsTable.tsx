"use client";

import React from "react";
import { PaginationBar, SkeletonTable } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { PoolTableRow } from "../types";
import { PoolTableRowItem } from "./PoolTableRowItem";

import type { PoolTypeFilter } from "../hooks/useEnvelopesTableData";

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
  onDrawDown?: (pool: PoolTableRow["rawPool"]) => void;
  onOpenCategoryDrawer?: (pool: PoolTableRow) => void;
  onAddPool?: (poolType?: "EVERYDAY" | "BILL" | "GOAL") => void;
  fmtMoney: (val: number | null | undefined) => string;
  isLoading?: boolean;
  searchQuery?: string;
  typeFilter?: PoolTypeFilter;
  isProjectionMode?: boolean;
}

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
  onDrawDown,
  onOpenCategoryDrawer,
  fmtMoney,
  isLoading = false,
  isProjectionMode = false,
}: PoolsTableProps) {
  const { fmtDate } = useLocale();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <SkeletonTable cols={4} rows={6} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden min-h-[220px]">
      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
              {/* Pools & Categories */}
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>{t("categories.title")}</span>
                  {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </th>

              {/* Current Balance */}
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("currentBalance")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("tables.currentBalance")}</span>
                  {sortField === "currentBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </th>

              {/* Target */}
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("targetAmount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("tables.target")}</span>
                  {sortField === "targetAmount" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </th>

              {/* Actions */}
              <th className="py-3.5 px-4 text-center">
                <span>{t("tables.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {isLoading ? (
              <tr className="animate-pulse">
                <td colSpan={4} className="p-0">
                  <SkeletonTable cols={4} rows={pageSize} />
                </td>
              </tr>
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-400 font-medium">
                  {t("categories.noEnvelopesFound")}
                </td>
              </tr>
            ) : (
              pools.map((pool) => (
                <PoolTableRowItem
                  key={pool.id}
                  pool={pool}
                  isProjectionMode={isProjectionMode}
                  onOpenCategoryDrawer={onOpenCategoryDrawer}
                  onEditPool={onEditPool}
                  onDrawDown={onDrawDown}
                  fmtMoney={fmtMoney}
                  fmtDate={fmtDate}
                />
              ))
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
