"use client";
import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { CategoryDetailDrawer } from "../../../components/web/CategoryDetailDrawer";
import { MoveMoneyModal } from "../../../components/web/MoveMoneyModal";
import { FilterBar } from "../../../components/web/FilterBar";
import { CategoryFormModal } from "../../../components/web/CategoryFormModal";

type SortField = "name" | "type" | "balance" | "health";
type SortDir = "asc" | "desc";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CategoriesPage() {
  const utils = trpc.useUtils();
  const categoriesQuery = trpc.listCategories.useQuery();
  const categories = categoriesQuery.data ?? [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Sort State
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection & Modals
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [isMoveMoneyOpen, setIsMoveMoneyOpen] = useState(false);

  // Mutations
  const archiveCategoryMut = trpc.archiveCategory.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
      utils.listCategories.invalidate();
    },
  });

  const handleArchive = async (cat: any) => {
    if (cat.type === "EVERYDAY") {
      alert("The Everyday category cannot be archived or deleted.");
      return;
    }
    if (confirm(`Are you sure you want to archive "${cat.name}"?`)) {
      try {
        await archiveCategoryMut.mutateAsync({ categoryId: cat.id });
      } catch (err: any) {
        alert(err.message || "Failed to archive category.");
      }
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter & Sort Logic
  const filtered = categories.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (healthFilter !== "ALL" && c.healthStatus !== healthFilter) return false;
    if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "type") {
      comparison = a.type.localeCompare(b.type);
    } else if (sortField === "balance") {
      comparison = parseFloat(a.currentBalance) - parseFloat(b.currentBalance);
    } else if (sortField === "health") {
      const order = { RED: 0, AMBER: 1, GREEN: 2 };
      comparison = (order[a.healthStatus as keyof typeof order] ?? 1) - (order[b.healthStatus as keyof typeof order] ?? 1);
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // Summary Metrics
  const onTrackCount = categories.filter((c) => c.healthStatus === "GREEN").length;
  const atRiskCount = categories.filter((c) => c.healthStatus === "AMBER").length;
  const missedCount = categories.filter((c) => c.healthStatus === "RED").length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Categories & Savings Pools</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Manage your Everyday pool, Bills, and Save Toward target pools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMoveMoneyOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-50 text-[#00B4A6] hover:bg-teal-100 border border-teal-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>↔️</span>
            <span>Move Money</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
          >
            <span>➕</span>
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Top Health Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setHealthFilter("ALL")}
          className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-all"
          title="Click to view All Categories"
        >
          <div>
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Categories</p>
            <p className="text-2xl font-black text-[#1B2B4B] mt-0.5">{categories.length}</p>
          </div>
          <span className="text-2xl">📁</span>
        </div>

        <div
          onClick={() => setHealthFilter("GREEN")}
          className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">On Track</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{onTrackCount}</p>
          </div>
          <span className="text-2xl">✅</span>
        </div>

        <div
          onClick={() => setHealthFilter("AMBER")}
          className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition-all"
        >
          <div>
            <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">At Risk</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{atRiskCount}</p>
          </div>
          <span className="text-2xl">⚠️</span>
        </div>

        <div
          onClick={() => setHealthFilter("RED")}
          className="p-4 bg-white rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 transition-all"
        >
          <div>
            <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Missed</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{missedCount}</p>
          </div>
          <span className="text-2xl">🚨</span>
        </div>
      </div>

      {/* Consistent Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search category name..."
        filterGroups={[
          {
            label: "Health",
            value: healthFilter,
            onChange: setHealthFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "GREEN", label: "On Track" },
              { id: "AMBER", label: "At Risk" },
              { id: "RED", label: "Missed" },
            ],
          },
          {
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "GOAL", label: "Save Toward" },
              { id: "REGULAR", label: "Regular Bills" },
              { id: "EVERYDAY", label: "Everyday" },
            ],
          },
        ]}
        onClearAll={() => {
          setSearchQuery("");
          setHealthFilter("ALL");
          setTypeFilter("ALL");
        }}
      />

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th onClick={() => toggleSort("name")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Category Name {sortField === "name" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("type")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Type {sortField === "type" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("balance")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Current Balance {sortField === "balance" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Target / Keep Limit</th>
              <th onClick={() => toggleSort("health")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Funding Health {sortField === "health" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-xs text-zinc-400 font-medium">
                  No matching categories found.
                </td>
              </tr>
            ) : (
              sorted.map((cat) => {
                const balanceVal = parseFloat(cat.currentBalance);
                const targetVal = cat.targetAmount ? parseFloat(cat.targetAmount) : 0;
                const pct = targetVal > 0 ? Math.min(100, Math.round((balanceVal / targetVal) * 100)) : 100;
                const healthColor =
                  cat.healthStatus === "GREEN" ? "#22C55E" : cat.healthStatus === "AMBER" ? "#F59E0B" : "#EF4444";

                return (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    {/* Category Name (Clickable Hyperlink) */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="text-[#00B4A6] hover:underline font-bold text-left cursor-pointer"
                      >
                        {cat.name}
                      </button>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 text-zinc-500">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-700 uppercase">
                        {cat.type === "GOAL" ? "Save Toward" : cat.type === "REGULAR" ? "Regular Bill" : "Everyday"}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 font-mono font-extrabold text-[#1B2B4B]">{fmt(balanceVal)}</td>

                    {/* Target / Keep Limit */}
                    <td className="px-6 py-4 font-mono text-zinc-600">
                      {cat.type === "EVERYDAY" ? (
                        cat.everydayTargetKeepAmount ? `Keep: ${fmt(cat.everydayTargetKeepAmount)}` : "—"
                      ) : cat.targetAmount ? (
                        fmt(cat.targetAmount)
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Progress & Health Bar */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 w-32">
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: healthColor }} />
                        </div>
                        <span className="text-[10px] font-extrabold text-zinc-500">{pct}% ({cat.healthStatus})</span>
                      </div>
                    </td>

                    {/* Actions: Edit Modal & Archive */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setIsFormModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                        >
                          Edit
                        </button>
                        {cat.type !== "EVERYDAY" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(cat)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Shared Move Money Modal */}
      <MoveMoneyModal
        isOpen={isMoveMoneyOpen}
        onClose={() => setIsMoveMoneyOpen(false)}
        onSuccess={() => {
          utils.listCategories.invalidate();
          utils.listCategories.invalidate();
        }}
      />

      {/* Unified Add/Edit Category Modal */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={() => {
          utils.listCategories.invalidate();
          utils.listCategories.invalidate();
        }}
      />

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        categoryId={selectedCategoryId}
        onClose={() => setSelectedCategoryId(null)}
      />
    </div>
  );
}
