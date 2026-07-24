"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { MoveMoneyModal } from "../../../components/web/MoveMoneyModal";
import { CategoryDetailDrawer } from "../../../components/web/CategoryDetailDrawer";
import { DashboardError } from "../../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const initialHealthFilter = searchParams.get("health") || "ALL";

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Filters & Search State
  const [healthFilter, setHealthFilter] = useState<string>(initialHealthFilter);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort State
  const [sortField, setSortField] = useState<"name" | "type" | "balance" | "health">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // New Category Form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"REGULAR" | "GOAL">("REGULAR");
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Category State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [editRolloverRule, setEditRolloverRule] = useState<"ROLLOVER" | "SWEEP" | "RESET">("ROLLOVER");
  const [editIsDefaultSavings, setEditIsDefaultSavings] = useState(false);
  const [editEverydayTargetKeepAmount, setEditEverydayTargetKeepAmount] = useState("");
  const [editEverydaySweepFrequency, setEditEverydaySweepFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY">("MONTHLY");
  const [saving, setSaving] = useState(false);

  const categoriesQuery = trpc.listCategories.useQuery();
  const createCategory = trpc.createCategory.useMutation();
  const updateCategory = trpc.updateCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const archiveCategory = trpc.archiveCategory.useMutation();

  // Escape key global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowCreateModal(false);
        setShowMoveModal(false);
        setEditingId(null);
        setSelectedCategoryId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = categoriesQuery.data ?? [];

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const newCat = await createCategory.mutateAsync({
        name: newName.trim(),
        type: newType,
        monthlyAmount: newType === "REGULAR" && newMonthlyAmount ? parseFloat(newMonthlyAmount).toFixed(2) : undefined,
      });

      if (newType === "GOAL" && newTargetAmount) {
        await createCategorySchedule.mutateAsync({
          categoryId: newCat.id,
          targetAmount: parseFloat(newTargetAmount).toFixed(2),
          targetDate: newTargetDate || undefined,
        });
      }

      setNewName("");
      setNewMonthlyAmount("");
      setNewTargetAmount("");
      setNewTargetDate("");
      setShowCreateModal(false);
      categoriesQuery.refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCategoryDetails = async (catId: string) => {
    setSaving(true);
    try {
      await updateCategory.mutateAsync({
        categoryId: catId,
        data: {
          name: editName,
          type: editCategoryType,
          rolloverRule: editRolloverRule,
          isDefaultSavings: editIsDefaultSavings,
          everydayTargetKeepAmount: editCategoryType === "EVERYDAY" && editEverydayTargetKeepAmount ? parseFloat(editEverydayTargetKeepAmount).toFixed(2) : undefined,
          everydaySweepFrequency: editCategoryType === "EVERYDAY" ? editEverydaySweepFrequency : undefined,
        },
      });

      if (editTarget && editTarget !== "0.00" && editCategoryType !== "EVERYDAY") {
        await createCategorySchedule.mutateAsync({
          categoryId: catId,
          targetAmount: parseFloat(editTarget || "0").toFixed(2),
          targetDate: editTargetDate || undefined,
        });
      }

      setEditingId(null);
      categoriesQuery.refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditTarget(cat.targetAmount ? parseFloat(cat.targetAmount).toFixed(2) : "0.00");
    setEditTargetDate(cat.targetDate ? cat.targetDate.split("T")[0] : "");
    setEditCategoryType(cat.type);
    setEditRolloverRule(cat.rolloverRule || "ROLLOVER");
    setEditIsDefaultSavings(cat.isDefaultSavings || false);
    setEditEverydayTargetKeepAmount(cat.everydayTargetKeepAmount ? parseFloat(cat.everydayTargetKeepAmount).toFixed(2) : "");
    setEditEverydaySweepFrequency(cat.everydaySweepFrequency || "MONTHLY");
  };

  const handleArchiveCategory = async (catId: string) => {
    if (!confirm("Are you sure you want to archive this category?")) return;
    try {
      await archiveCategory.mutateAsync({ categoryId: catId });
      categoriesQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to archive category.");
    }
  };

  // Filter categories
  let filtered = [...categories];

  if (healthFilter !== "ALL") {
    filtered = filtered.filter((c) => c.healthStatus === healthFilter);
  }

  if (typeFilter !== "ALL") {
    filtered = filtered.filter((c) => c.type === typeFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
  }

  // Sort categories
  filtered.sort((a, b) => {
    let comp = 0;
    if (sortField === "name") comp = a.name.localeCompare(b.name);
    else if (sortField === "type") comp = a.type.localeCompare(b.type);
    else if (sortField === "balance") comp = parseFloat(a.currentBalance) - parseFloat(b.currentBalance);
    else if (sortField === "health") comp = a.healthStatus.localeCompare(b.healthStatus);

    return sortDir === "asc" ? comp : -comp;
  });

  const toggleSort = (field: "name" | "type" | "balance" | "health") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2B4B]">Categories</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Manage Regular Bills, Save Toward targets, and Everyday pool</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMoveModal(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>🔄</span> Move Money
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-sm"
          >
            + Create Category
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />

        {/* Filter Groups */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Health Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase px-2">Health:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "GREEN", label: "On Track 🟢" },
              { id: "AMBER", label: "At Risk 🟠" },
              { id: "RED", label: "Missed 🔴" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHealthFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  healthFilter === f.id ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase px-2">Type:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "GOAL", label: "Save Toward" },
              { id: "REGULAR", label: "Regular Bills" },
              { id: "EVERYDAY", label: "Everyday" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  typeFilter === f.id ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th onClick={() => toggleSort("name")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Category Name {sortField === "name" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("type")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Type {sortField === "type" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("balance")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Current Balance {sortField === "balance" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Target / Limit</th>
              <th onClick={() => toggleSort("health")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Funding Health {sortField === "health" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-xs text-zinc-400">
                  No matching categories found.
                </td>
              </tr>
            ) : (
              filtered.map((cat) => {
                const isEditing = editingId === cat.id;
                const balanceVal = parseFloat(cat.currentBalance);
                const targetVal = cat.targetAmount ? parseFloat(cat.targetAmount) : 0;
                const pct = targetVal > 0 ? Math.min(100, Math.round((balanceVal / targetVal) * 100)) : 100;

                const healthColor =
                  cat.healthStatus === "GREEN" ? "#22C55E" : cat.healthStatus === "AMBER" ? "#F59E0B" : "#EF4444";

                return (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    {/* Name / Hyperlink */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border border-zinc-200 rounded-lg text-xs"
                        />
                      ) : (
                        <button
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className="text-[#00B4A6] hover:underline font-bold text-left"
                        >
                          {cat.name}
                        </button>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 text-zinc-500">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-700">
                        {cat.type === "GOAL" ? "Save Toward" : cat.type === "REGULAR" ? "Regular Bill" : "Everyday"}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 font-mono font-bold text-[#1B2B4B]">{fmt(balanceVal)}</td>

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
                        <span className="text-[10px] font-bold text-zinc-500">{pct}% ({cat.healthStatus})</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSaveCategoryDetails(cat.id)}
                            disabled={saving}
                            className="px-2.5 py-1 bg-[#00B4A6] text-white rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="text-xs font-bold text-zinc-400 hover:text-[#1B2B4B]"
                          >
                            Edit
                          </button>
                          {cat.type !== "EVERYDAY" && (
                            <button
                              onClick={() => handleArchiveCategory(cat.id)}
                              className="text-xs font-bold text-rose-400 hover:text-rose-600"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      )}
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
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onSuccess={() => categoriesQuery.refetch()}
      />

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2B4B]">Create New Category</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Car Insurance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                >
                  <option value="REGULAR">Regular Bill (Recurring obligation)</option>
                  <option value="GOAL">Save Toward (Target savings pool)</option>
                </select>
                <span className="text-[10px] text-zinc-400 mt-1">Note: Additional Everyday categories cannot be created.</span>
              </div>

              {newType === "REGULAR" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Monthly Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newMonthlyAmount}
                    onChange={(e) => setNewMonthlyAmount(e.target.value)}
                    className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTargetAmount}
                      onChange={(e) => setNewTargetAmount(e.target.value)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target Date</label>
                    <input
                      type="date"
                      value={newTargetDate}
                      onChange={(e) => setNewTargetDate(e.target.value)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
              >
                {creating ? "Creating..." : "Save Category"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        categoryId={selectedCategoryId}
        onClose={() => setSelectedCategoryId(null)}
      />
    </div>
  );
}
