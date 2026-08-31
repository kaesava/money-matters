"use client";

import React, { useState } from "react";
import Link from "next/link";
import { fmtDate, ResizableTh, PaginationBar, SkeletonTable } from "@money-matters/ui/web";
import { PoolTableRow } from "../types";

interface PoolsTableProps {
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
  isLoading = false,
}: PoolsTableProps) {
  const [widths, setWidths] = useState({
    pool: 280,
    categories: 140,
    bankAccount: 160,
    balance: 140,
    target: 140,
    progress: 170,
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

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
              {/* Pool Name + Type Badge */}
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

              {/* Categories */}
              <ResizableTh
                width={widths.categories}
                onResizeMouseDown={(e) => onMouseDown("categories", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>Categories</span>
              </ResizableTh>

              {/* Bank Account */}
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
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-center"
                onClick={() => toggleSort("targetDate")}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Progress & Timeline</span>
                  {sortField === "targetDate" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* HISTORY Header */}
              <th style={{ width: `${widths.actions}px` }} className="py-3.5 px-4 text-right text-zinc-500">
                <span>HISTORY</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <SkeletonTable cols={7} rows={pageSize} />
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs font-medium">
                  No pools found.
                </td>
              </tr>
            ) : (
              pools.map((row) => {
                const isEveryday = row.poolType === "EVERYDAY";
                const isGoal = row.poolType === "GOAL";

                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors group text-xs">
                    {/* Pool Name + Inline Type & Private Badges */}
                    <td className="py-4 px-4 font-bold text-[#1B2B4B]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onEditPool(row.rawPool)}
                          className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                          title="Click to edit pool"
                        >
                          {row.name}
                        </button>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            row.poolType === "EVERYDAY"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.poolType === "REGULAR"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {row.poolType === "EVERYDAY" ? "Everyday" : row.poolType === "REGULAR" ? "Bills" : "Goal"}
                        </span>
                      </div>
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

                    {/* Bank Account (Hyperlink to Bank Accounts page search) */}
                    <td className="py-4 px-4 text-zinc-600 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        {row.bankAccountName ? (
                          <Link
                            href={`/dashboard/bank-accounts?search=${encodeURIComponent(row.bankAccountName)}`}
                            className="text-[#2563eb] hover:underline font-semibold"
                            title={`View bank account ${row.bankAccountName}`}
                          >
                            {row.bankAccountName}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                        {row.isPrivate && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                            🔒 Private
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

                    {/* Progress & Timeline (Badges for Everyday & Bills; Pct for Goals) */}
                    <td className="py-4 px-4 text-center">
                      {isGoal ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-purple-700 text-xs bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            {row.progressText}
                          </span>
                          {row.targetDate && (
                            <span className="text-[10px] text-zinc-400 font-medium">
                              Target: {fmtDate(row.targetDate, "Australia/Sydney")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`text-xs font-extrabold px-2.5 py-1 rounded-full border inline-block ${
                            row.progressText === "Ready to spend" || row.progressText === "Fully Funded"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.progressText === "On Track"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {row.progressText}
                        </span>
                      )}
                    </td>

                    {/* HISTORY Link (Hyperlink navigating to History page pre-filtered) */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/dashboard/history?search=${encodeURIComponent(row.name)}`}
                        className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                        title={`View transaction history for ${row.name}`}
                      >
                        History
                      </Link>
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
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
