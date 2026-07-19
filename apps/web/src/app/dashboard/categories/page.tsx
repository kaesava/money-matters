"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { CategoryDetailDrawer } from "../../../components/web/CategoryDetailDrawer";
import { DashboardError } from "../../../components/web/DashboardError";
import { trpc } from "../../../lib/trpc";

type CategoryWithHealth = {
  id: string;
  name: string;
  type: "REGULAR" | "GOAL" | "EVERYDAY";
  currentBalance: string;
  targetAmount: string | null;
  healthStatus: "GREEN" | "AMBER" | "RED";
  targetDate: string | null;
  progressPercentage: number;
};

export default function CategoriesPage() {
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery } = useDashboardData();
  
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [creating, setCreating] = useState(false);

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];

  const createCategory = trpc.createCategory.useMutation();
  const totalOnTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const totalAtRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

  const isLoading = isLoadingTenant || categoriesQuery.isLoading;
  const error = tenantError ?? categoriesQuery.error;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [saving, setSaving] = useState(false);

  const updateCategory = trpc.updateCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();

  const handleSaveCategoryDetails = async (catId: string) => {
    setSaving(true);
    try {
      await updateCategory.mutateAsync({
        categoryId: catId,
        data: {
          name: editName,
        }
      });
      if (editCategoryType === "GOAL") {
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

  const handleStartEdit = (cat: CategoryWithHealth) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditTarget(cat.targetAmount ? parseFloat(cat.targetAmount).toFixed(2) : "0.00");
    setEditTargetDate(cat.targetDate ? cat.targetDate.split("T")[0] : "");
    setEditCategoryType(cat.type);
  };

  const regularBillsItems = categories.filter(c => c.type === "REGULAR");
  const saveTowardItems = categories.filter(c => c.type === "GOAL");
  const everydayItems = categories.filter(c => c.type === "EVERYDAY");

  const everydayTotalBalance = everydayItems.reduce((acc, c) => acc + parseFloat(c.currentBalance), 0);

  const [activeTab, setActiveTab] = useState<"SAVE_TOWARD" | "REGULAR_BILLS" | "EVERYDAY">("SAVE_TOWARD");

  const activeItems = 
    activeTab === "SAVE_TOWARD" ? saveTowardItems :
    activeTab === "REGULAR_BILLS" ? regularBillsItems : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            {t("nav.categories")}
          </h1>
          {!isLoading && !error && hasTenant && (
            <p className="text-sm mt-0.5" style={{ color: "var(--dash-muted)" }}>
              {t("home.onTrack", { count: totalOnTrack })} · {t("home.atRisk", { count: totalAtRisk })}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "var(--dash-teal)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Bucket</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("SAVE_TOWARD")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "SAVE_TOWARD" ? "border-[#00B4A6] text-[#1B2B4B]" : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Save Toward ({saveTowardItems.length})
        </button>
        <button
          onClick={() => setActiveTab("REGULAR_BILLS")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "REGULAR_BILLS" ? "border-[#00B4A6] text-[#1B2B4B]" : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Regular Bills ({regularBillsItems.length})
        </button>
        <button
          onClick={() => setActiveTab("EVERYDAY")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "EVERYDAY" ? "border-[#00B4A6] text-[#1B2B4B]" : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Everyday Spending (Pool)
        </button>
      </div>

      {/* Content View */}
      {isLoading ? (
        <div className="h-64 rounded-2xl animate-pulse bg-zinc-200/50" />
      ) : error ? (
        <DashboardError error={error} onRetry={() => categoriesQuery.refetch()} />
      ) : activeTab === "EVERYDAY" ? (
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Everyday Spending Pool</p>
              <p className="text-3xl font-extrabold mt-1 text-[#1B2B4B]">
                ${everydayTotalBalance.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-bold">
              Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Everyday spending categories are aggregated to avoid micro-management. Your transactions are recorded directly from this balance pool without manual allocations per-category.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Current Balance</th>
                  <th className="px-6 py-4">Target Amount</th>
                  <th className="px-6 py-4">Target Date</th>
                  <th className="px-6 py-4">% Funded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {activeItems.map((cat) => {
                  const isEditing = editingId === cat.id;
                  const balanceVal = parseFloat(cat.currentBalance);
                  const targetVal = cat.targetAmount ? parseFloat(cat.targetAmount) : 0;
                  const percent = targetVal > 0 ? Math.min(100, Math.round((balanceVal / targetVal) * 100)) : 0;

                  return (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-sm">
                      <td className="px-6 py-4 font-semibold text-[#1B2B4B]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none"
                          />
                        ) : (
                          cat.name
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        ${balanceVal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm w-24 focus:outline-none"
                          />
                        ) : cat.targetAmount ? (
                          `$${targetVal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editTargetDate}
                            onChange={(e) => setEditTargetDate(e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none"
                          />
                        ) : cat.targetDate ? (
                          new Date(cat.targetDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-[#00B4A6] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs text-[#00B4A6]">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveCategoryDetails(cat.id)}
                              disabled={saving}
                              className="bg-[#00B4A6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="border border-zinc-200 text-zinc-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="text-xs font-bold border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 text-zinc-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setSelectedBucketId(cat.id)}
                              className="text-xs font-bold text-white bg-[#1B2B4B] rounded-lg px-3 py-1.5 hover:opacity-90"
                            >
                              View History
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBucketId && (
        <CategoryDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => {
            setSelectedBucketId(null);
            categoriesQuery.refetch();
          }}
        />
      )}

      {/* New Bucket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          />
          <div className="relative pointer-events-auto w-full max-w-md bg-white shadow-2xl rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1B2B4B]">Create New Bucket</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newName) return;
                setCreating(true);
                try {
                  const created = await createCategory.mutateAsync({
                    name: newName,
                    type: newType,
                    monthlyAmount: newType === "REGULAR" && newMonthlyAmount ? newMonthlyAmount : undefined,
                  });
                  if (newType === "GOAL" && newTargetAmount) {
                    await createCategorySchedule.mutateAsync({
                      categoryId: created.id,
                      targetAmount: newTargetAmount,
                      targetDate: newTargetDate || undefined,
                    });
                  }
                  setShowCreateModal(false);
                  setNewName("");
                  setNewMonthlyAmount("");
                  setNewTargetAmount("");
                  setNewTargetDate("");
                  categoriesQuery.refetch();
                } catch (err) {
                  console.error(err);
                } finally {
                  setCreating(false);
                }
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Bucket Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity & Gas"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Bucket Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                >
                  <option value="REGULAR">REGULAR (Bills & Commitments)</option>
                  <option value="GOAL">GOAL (Save Toward Target)</option>
                  <option value="EVERYDAY">EVERYDAY (Day-to-day Pool)</option>
                </select>
              </div>

              {newType === "REGULAR" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Monthly Target ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    value={newMonthlyAmount}
                    onChange={(e) => setNewMonthlyAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                  />
                </div>
              )}

              {newType === "GOAL" && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Goal Target Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000.00"
                      value={newTargetAmount}
                      onChange={(e) => setNewTargetAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">Target Date (Optional)</label>
                    <input
                      type="date"
                      value={newTargetDate}
                      onChange={(e) => setNewTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--dash-teal]"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Bucket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
