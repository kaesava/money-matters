"use client";

import React, { useState } from "react";
import { ResizableTh, PaginationBar, SkeletonTable } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";
import { PoolTableRow } from "../types";
import { PoolTableRowItem } from "./PoolTableRowItem";

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
  fmtMoney,
  isLoading = false,
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
              pools.map((pool) => (
                <PoolTableRowItem
                  key={pool.id}
                  pool={pool}
                  isProjectionMode={isProjectionMode}
                  onOpenCategoryDrawer={onOpenCategoryDrawer}
                  onEditPool={onEditPool}
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
