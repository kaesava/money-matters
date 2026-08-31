"use client";

import React from "react";
import { PaginationBar, ResizableTh, useResizableColumns, fmtDate } from "@money-matters/ui/web";
import { CategorySummaryItem, PoolTableRow } from "../types";

export interface PoolsTableProps {
  pools: PoolTableRow[];
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  sortField: "name" | "currentBalance" | "targetAmount" | "targetDate";
  sortDir: "asc" | "desc";
  toggleSort: (field: "name" | "currentBalance" | "targetAmount" | "targetDate") => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onEditPool: (pool: CategorySummaryItem) => void;
  onOpenCategoryDrawer: (pool: PoolTableRow) => void;
  onOpenActivity?: (pool: CategorySummaryItem) => void;
  fmtMoney: (val: number | null | undefined) => string;
  isLoading?: boolean;
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
  onOpenActivity,
  fmtMoney,
  isLoading,
}: PoolsTableProps) {
  const { widths, onMouseDown } = useResizableColumns({
    pool: 280,
    balance: 180,
    target: 180,
    progress: 240,
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
              <ResizableTh
                width={widths.pool}
                onResizeMouseDown={(e) => onMouseDown("pool", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left"
                onClick={() => toggleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Pool</span>
                  {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              <ResizableTh
                width={widths.balance}
                onResizeMouseDown={(e) => onMouseDown("balance", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("currentBalance")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Current Balance</span>
                  {sortField === "currentBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              <ResizableTh
                width={widths.target}
                onResizeMouseDown={(e) => onMouseDown("target", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("targetAmount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Target Amount</span>
                  {sortField === "targetAmount" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              <ResizableTh
                width={widths.progress}
                onResizeMouseDown={(e) => onMouseDown("progress", e)}
                className="py-3.5 px-4 text-center cursor-pointer hover:text-zinc-800 transition-colors"
                onClick={() => toggleSort("targetDate")}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Progress & Timeline</span>
                  {sortField === "targetDate" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded-md w-36" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded-md w-24 ml-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded-md w-24 ml-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-32 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-6 bg-zinc-200 rounded-lg w-16 ml-auto" /></td>
                </tr>
              ))
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-400 font-medium">
                  No pools found matching your search.
                </td>
              </tr>
            ) : (
              pools.map((row) => {
                const isGoal = row.poolType === "GOAL";
                const isEveryday = row.poolType === "EVERYDAY";

                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors group text-xs">
                    {/* Pool Name + Categories link */}
                    <td className="py-4 px-4 font-bold text-[#1B2B4B]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditPool(row.rawPool)}
                          className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                        >
                          {row.name}
                        </button>
                        {isGoal && (
                          <button
                            type="button"
                            onClick={() => onOpenCategoryDrawer(row)}
                            className="text-[11px] font-semibold text-[#2563eb] hover:underline cursor-pointer"
                            title="Manage goal categories"
                          >
                            ({row.categoryCount})
                          </button>
                        )}
                        {row.isPrivate && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Private
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Current Balance */}
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-black text-[#1B2B4B]">
                      {fmtMoney(row.currentBalance)}
                    </td>

                    {/* Target Amount */}
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-semibold text-zinc-700">
                      {isEveryday || row.targetAmount === null || row.targetAmount === undefined ? (
                        <span className="text-zinc-400 font-normal">—</span>
                      ) : (
                        fmtMoney(row.targetAmount)
                      )}
                    </td>

                    {/* Progress & Timeline */}
                    <td className="py-4 px-4 text-center">
                      {isGoal ? (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-zinc-800 text-xs">{row.progressText}</span>
                          {row.targetDate && (
                            <span className="text-[10px] text-zinc-400 font-medium">
                              Target: {fmtDate(row.targetDate, "Australia/Sydney")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-zinc-700">{row.progressText}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onOpenActivity && (
                          <button
                            type="button"
                            onClick={() => onOpenActivity(row.rawPool)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            Activity
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditPool(row.rawPool)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
