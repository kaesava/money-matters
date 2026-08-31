"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PaginationBar, ResizableTh, useResizableColumns, fmtDate } from "@money-matters/ui/web";
import { CategorySummaryItem, PoolTableRow } from "../types";

export interface PoolsTableProps {
  pools: PoolTableRow[];
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  sortField: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate";
  sortDir: "asc" | "desc";
  toggleSort: (field: "name" | "bankAccountName" | "poolType" | "currentBalance" | "targetAmount" | "targetDate") => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onEditPool: (pool: CategorySummaryItem) => void;
  onOpenCategoryDrawer: (pool: PoolTableRow) => void;
  onAddCategoryForPool: (poolId: string) => void;
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
  onAddCategoryForPool,
  fmtMoney,
  isLoading,
}: PoolsTableProps) {
  const router = useRouter();
  const { widths, onMouseDown } = useResizableColumns({
    pool: 220,
    bankAccount: 160,
    type: 110,
    categories: 140,
    balance: 140,
    target: 140,
    progress: 180,
  });

  const handleGoToHistory = (poolName: string) => {
    router.push(`/dashboard/history?search=${encodeURIComponent(poolName)}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
              {/* Pool Name */}
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

              {/* Pool Type */}
              <ResizableTh
                width={widths.type}
                onResizeMouseDown={(e) => onMouseDown("type", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-center"
                onClick={() => toggleSort("poolType")}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Type</span>
                  {sortField === "poolType" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Categories */}
              <ResizableTh
                width={widths.categories}
                onResizeMouseDown={(e) => onMouseDown("categories", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>Categories</span>
              </ResizableTh>

              {/* Bank Account (after Categories) */}
              <ResizableTh
                width={widths.bankAccount}
                onResizeMouseDown={(e) => onMouseDown("bankAccount", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-left"
                onClick={() => toggleSort("bankAccountName")}
              >
                <div className="flex items-center gap-1">
                  <span>Bank Account</span>
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
                  <span>Current Balance</span>
                  {sortField === "currentBalance" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Target Amount */}
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

              {/* Progress & Timeline */}
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

              {/* Actions */}
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded-md w-36" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded-md w-24" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-16 mx-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded-md w-24 ml-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded-md w-24 ml-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-zinc-200 rounded-md w-28 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-6 bg-zinc-200 rounded-lg w-16 ml-auto" /></td>
                </tr>
              ))
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 font-medium">
                  No pools found matching your search.
                </td>
              </tr>
            ) : (
              pools.map((row) => {
                const isGoal = row.poolType === "GOAL";
                const isEveryday = row.poolType === "EVERYDAY";

                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors group text-xs">
                    {/* Pool Name */}
                    <td className="py-4 px-4 font-bold text-[#1B2B4B]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditPool(row.rawPool)}
                          className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                          title="Click to edit pool"
                        >
                          {row.name}
                        </button>
                        {row.isPrivate && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Private
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pool Type */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          row.poolType === "EVERYDAY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : row.poolType === "REGULAR"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {row.poolType === "EVERYDAY" ? "Everyday" : row.poolType === "REGULAR" ? "Bills" : "Goal"}
                      </span>
                    </td>

                    {/* Categories Column */}
                    <td className="py-4 px-4 text-center">
                      {!isGoal ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenCategoryDrawer(row)}
                            className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                            title="View category details"
                          >
                            {row.categoryCount} {row.categoryCount === 1 ? "Category" : "Categories"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddCategoryForPool(row.id)}
                            className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563eb] font-extrabold flex items-center justify-center text-xs border border-blue-200 transition-colors cursor-pointer"
                            title="Add category to this pool"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Bank Account (after Categories) */}
                    <td className="py-4 px-4 text-zinc-600 font-medium">
                      {row.bankAccountName || <span className="text-zinc-400">—</span>}
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

                    {/* Actions: History ONLY (Edit button removed as clicking Pool Name edits) */}
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleGoToHistory(row.name)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer border border-zinc-200"
                        title="View history for this pool"
                      >
                        History
                      </button>
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
