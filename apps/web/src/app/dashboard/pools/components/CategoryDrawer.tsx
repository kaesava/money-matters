"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SlideOverDrawer, SearchInput } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { CategoryItem, PoolTableRow } from "../types";

interface CategoryDrawerProps {
  pool: PoolTableRow | null;
  onClose: () => void;
  onEditCategory?: (cat: CategoryItem) => void;
  onAddCategory?: (poolId: string) => void;
}

export function CategoryDrawer({ pool, onClose, onEditCategory, onAddCategory }: CategoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "monthlyAmount">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const poolId = pool?.id ?? null;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: Boolean(poolId),
  });

  if (!pool || !poolId) return null;

  const poolCategories: CategoryItem[] = (categoriesQuery.data ?? [])
    .filter((c: { poolId: string }) => c.poolId === poolId)
    .map((c: { id: string; poolId: string; name: string; monthlyAmount?: string | null; enteredAmount?: string | null; budgetFrequency?: string | null; isEssential?: boolean; monthlySpent?: number }) => ({
      id: c.id,
      poolId: c.poolId,
      name: c.name,
      monthlyAmount: c.monthlyAmount,
      enteredAmount: c.enteredAmount,
      budgetFrequency: c.budgetFrequency,
      isEssential: c.isEssential,
      monthlySpent: c.monthlySpent,
    }));

  const filteredCategories = poolCategories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    return cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";

    if (sortField === "name") {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortField === "monthlyAmount") {
      aVal = a.monthlyAmount ? parseFloat(a.monthlyAmount) : 0;
      bVal = b.monthlyAmount ? parseFloat(b.monthlyAmount) : 0;
    }

    if (aVal === bVal) return 0;
    if (sortDir === "asc") return aVal < bVal ? -1 : 1;
    return aVal > bVal ? -1 : 1;
  });

  const toggleSort = (field: "name" | "monthlyAmount") => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleStartAdd = () => {
    if (onAddCategory) {
      onClose();
      onAddCategory(pool.id);
    }
  };

  const handleStartEdit = (cat: CategoryItem) => {
    if (onEditCategory) {
      onClose();
      onEditCategory(cat);
    }
  };

  return (
    <SlideOverDrawer
      title={`${pool.name} Categories`}
      subtitle="Pool categories and target allocations"
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <div className="p-6 flex flex-col gap-6">
        {/* Read-Only Pool Summary Card */}
        <div className="p-4 bg-slate-50 border border-zinc-200/80 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#1B2B4B]">{pool.name}</span>
              {pool.isPrivate && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                  🔒 Private
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                pool.poolType === "EVERYDAY"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : pool.poolType === "REGULAR"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              {pool.poolType === "EVERYDAY" ? "Everyday Pool" : pool.poolType === "REGULAR" ? "Bills Pool" : "Goal Pool"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-zinc-200/60">
            <div>
              <span className="text-zinc-400 font-semibold block text-[11px]">Bank Account</span>
              <span className="font-bold text-zinc-700">{pool.bankAccountName || "Unlinked"}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 font-semibold block text-[11px]">
                {pool.poolType !== "GOAL" ? "Current Balance / Monthly Target" : "Current Balance"}
              </span>
              <div className="flex items-center justify-end gap-1 font-mono font-black text-[#1B2B4B]">
                <span>
                  ${pool.currentBalance.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {pool.poolType !== "GOAL" && (() => {
                  const target = pool.poolType === "EVERYDAY"
                    ? (pool.rawPool.everydayAllowanceAmount ? parseFloat(pool.rawPool.everydayAllowanceAmount) : pool.targetAmount)
                    : pool.targetAmount;
                  return target != null && target > 0 ? (
                    <span className="text-xs text-zinc-500 font-semibold">
                      / ${target.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Header Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search category name..."
            />
          </div>
          <button
            type="button"
            onClick={handleStartAdd}
            className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#2563eb] text-white hover:bg-blue-700 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            + New Category
          </button>
        </div>

        {/* Categories Table */}
        {categoriesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="py-10 text-center text-xs font-medium text-zinc-400 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
            {searchQuery ? "No categories matched your search." : "No categories defined for this pool yet."}
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 font-bold uppercase tracking-wider select-none">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-zinc-800 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Category Name</span>
                      {sortField === "name" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-zinc-800 transition-colors"
                    onClick={() => toggleSort("monthlyAmount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Monthly Target</span>
                      {sortField === "monthlyAmount" && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">HISTORY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {sortedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1B2B4B]">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer"
                        title="Click to edit category"
                      >
                        {cat.name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-700">
                      {cat.monthlyAmount ? (
                        `$${parseFloat(cat.monthlyAmount).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-zinc-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/history?search=${encodeURIComponent(cat.name)}`}
                        className="font-semibold text-[#2563eb] hover:underline text-xs"
                        title={`View history for ${cat.name}`}
                      >
                        History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SlideOverDrawer>
  );
}
