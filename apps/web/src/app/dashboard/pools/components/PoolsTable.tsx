"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ResizableTh, PaginationBar, SkeletonTable } from "@money-matters/ui/web";
import { PoolTableRow, CategoryItem } from "../types";

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
  onAddCategoryForPool: (poolId: string) => void;
  onEditCategory?: (category: CategoryItem) => void;
  onAddPool?: (poolType?: "EVERYDAY" | "REGULAR" | "GOAL") => void;
  fmtMoney: (val: number | null | undefined) => string;
  isLoading?: boolean;
  searchQuery?: string;
}

const POOL_TYPE_LABELS: Record<"EVERYDAY" | "REGULAR" | "GOAL", string> = {
  EVERYDAY: "Everyday Pools",
  REGULAR: "Bills Pools",
  GOAL: "Goals",
};

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
  onAddCategoryForPool,
  onEditCategory,
  onAddPool,
  fmtMoney,
  isLoading = false,
  searchQuery = "",
}: PoolsTableProps) {
  const [widths, setWidths] = useState({
    name: 300,
    bankAccount: 180,
    balance: 140,
    target: 140,
    progress: 150,
    actions: 100,
  });

  // Expansion state
  // Level 1: Pool Types (expanded by default)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    EVERYDAY: true,
    REGULAR: true,
    GOAL: true,
  });

  // Level 2: Pools (collapsed by default)
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});

  // Auto expand when search query is active
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedTypes({ EVERYDAY: true, REGULAR: true, GOAL: true });
      const poolExpMap: Record<string, boolean> = {};
      for (const p of pools) {
        poolExpMap[p.id] = true;
      }
      setExpandedPools(poolExpMap);
    }
  }, [searchQuery, pools]);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const togglePool = (poolId: string) => {
    setExpandedPools((prev) => ({ ...prev, [poolId]: !prev[poolId] }));
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

  // Group pools by type
  const poolTypes: Array<"EVERYDAY" | "REGULAR" | "GOAL"> = ["EVERYDAY", "REGULAR", "GOAL"];

  const groupedPools = poolTypes.map((type) => {
    const items = pools.filter((p) => p.poolType === type);
    const totalBalance = items.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
    const totalTarget = items.reduce((sum, p) => sum + (p.targetAmount || 0), 0);
    return {
      type,
      label: POOL_TYPE_LABELS[type],
      items,
      totalBalance,
      totalTarget,
    };
  });

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
                  <span>Pools &amp; Categories</span>
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

              {/* Target */}
              <ResizableTh
                width={widths.target}
                onResizeMouseDown={(e) => onMouseDown("target", e)}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 transition-colors text-right"
                onClick={() => toggleSort("targetAmount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Target</span>
                  {sortField === "targetAmount" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </div>
              </ResizableTh>

              {/* Progress */}
              <ResizableTh
                width={widths.progress}
                onResizeMouseDown={(e) => onMouseDown("progress", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>Progress</span>
              </ResizableTh>

              {/* History */}
              <ResizableTh
                width={widths.actions}
                onResizeMouseDown={(e) => onMouseDown("actions", e)}
                className="py-3.5 px-4 text-center"
              >
                <span>History</span>
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
                  No pools found matching your criteria.
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
                          {onAddPool && (
                            <button
                              type="button"
                              onClick={() => onAddPool(group.type)}
                              className="px-1.5 py-0.5 text-[10px] font-black bg-[#2563eb] hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                              title={`Create New ${group.label}`}
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
                        const isPoolExpanded = Boolean(expandedPools[pool.id]);
                        const isGoal = pool.poolType === "GOAL";
                        const hasCategories = !isGoal && pool.categories.length > 0;

                        return (
                          <React.Fragment key={pool.id}>
                            <tr className="hover:bg-slate-50/80 transition-colors group/row">
                              {/* Level 2 Name */}
                              <td className="py-2.5 px-4 pl-8">
                                <div className="flex items-center gap-2">
                                  {!isGoal ? (
                                    <button
                                      type="button"
                                      onClick={() => togglePool(pool.id)}
                                      className="p-0.5 hover:bg-zinc-200 rounded text-zinc-400 font-extrabold text-[10px] cursor-pointer"
                                    >
                                      {isPoolExpanded ? "▼" : "▶"}
                                    </button>
                                  ) : (
                                    <span className="w-4 inline-block" />
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => onEditPool(pool.rawPool)}
                                    className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                                  >
                                    {pool.name}
                                  </button>

                                  {!isGoal && (
                                    <span className="text-[10px] font-bold text-zinc-400">
                                      ({pool.categories.length})
                                    </span>
                                  )}

                                  {!isGoal && (
                                    <button
                                      type="button"
                                      onClick={() => onAddCategoryForPool(pool.id)}
                                      className="px-1 py-0.5 text-[9px] font-bold text-[#2563eb] hover:bg-blue-50 rounded border border-blue-200 transition-colors cursor-pointer"
                                      title="Add Category within Pool"
                                    >
                                      +
                                    </button>
                                  )}

                                  {pool.isPrivate && (
                                    <span title="Private" className="text-[10px] cursor-help">
                                      🔒
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Bank Account */}
                              <td className="py-2.5 px-4 text-left">
                                {pool.bankAccountName ? (
                                  <Link
                                    href="/dashboard/bank-accounts"
                                    className="font-semibold text-zinc-600 hover:text-[#2563eb] hover:underline"
                                  >
                                    {pool.bankAccountName}
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
                              </td>

                              {/* History Link */}
                              <td className="py-2.5 px-4 text-center">
                                <Link
                                  href={`/dashboard/history?search=${encodeURIComponent(pool.name)}`}
                                  className="text-xs font-bold text-[#2563eb] hover:underline"
                                >
                                  History
                                </Link>
                              </td>
                            </tr>

                            {/* LEVEL 3: CATEGORY ROWS */}
                            {isPoolExpanded &&
                              hasCategories &&
                              pool.categories.map((cat) => (
                                <tr key={cat.id} className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors">
                                  {/* Level 3 Name */}
                                  <td className="py-2 px-4 pl-14">
                                    <button
                                      type="button"
                                      onClick={() => onEditCategory?.(cat)}
                                      className="font-semibold text-zinc-700 hover:text-[#2563eb] hover:underline text-left cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>•</span>
                                      <span>{cat.name}</span>
                                    </button>
                                  </td>

                                  <td className="py-2 px-4 text-center text-zinc-400">—</td>
                                  <td className="py-2 px-4 text-center text-zinc-400">—</td>

                                  {/* Category Target */}
                                  <td className="py-2 px-4 text-right font-mono text-zinc-600">
                                    <div className="flex flex-col items-end">
                                      <span className="font-bold">
                                        ${cat.monthlyAmount ? parseFloat(cat.monthlyAmount).toFixed(2) : "0.00"}/mo
                                      </span>
                                      {cat.enteredAmount &&
                                        cat.budgetFrequency &&
                                        cat.budgetFrequency !== "MONTHLY" && (
                                          <span className="text-[10px] text-zinc-400 font-medium">
                                            (${parseFloat(cat.enteredAmount).toFixed(2)}/{cat.budgetFrequency.toLowerCase()})
                                          </span>
                                        )}
                                    </div>
                                  </td>

                                  <td className="py-2 px-4 text-center text-zinc-400">—</td>

                                  {/* Category History */}
                                  <td className="py-2 px-4 text-center">
                                    <Link
                                      href={`/dashboard/history?search=${encodeURIComponent(cat.name)}`}
                                      className="text-[11px] font-bold text-zinc-500 hover:text-[#2563eb] hover:underline"
                                    >
                                      History
                                    </Link>
                                  </td>
                                </tr>
                              ))}
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

      {totalItems > 0 && (
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
