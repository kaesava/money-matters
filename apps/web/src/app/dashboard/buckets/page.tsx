"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { useDashboardData } from "../../../hooks/useDashboardData";
import { BucketDetailDrawer } from "../../../components/web/BucketDetailDrawer";
import { ShortfallResolutionDrawer } from "../../../components/web/ShortfallResolutionDrawer";
import { DashboardError } from "../../../components/web/DashboardError";
import { trpc } from "../../../lib/trpc";

type CategoryWithHealth = {
  id: string;
  name: string;
  type: string;
  currentBalance: string;
  targetAmount: string | null;
  healthStatus: "GREEN" | "AMBER" | "RED";
  nextDueDate: string | null;
  progressPercentage: number;
};

export default function CategoriesPage() {
  const { hasTenant, isLoadingTenant, tenantError, categoriesQuery } = useDashboardData();
  
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [shortfallBucketId, setShortfallBucketId] = useState<string | null>(null);

  const categories = (categoriesQuery.data ?? []) as CategoryWithHealth[];

  const totalOnTrack = categories.filter((c) => c.healthStatus === "GREEN").length;
  const totalAtRisk = categories.filter((c) => c.healthStatus === "AMBER" || c.healthStatus === "RED").length;

  const isLoading = isLoadingTenant || categoriesQuery.isLoading;
  const error = tenantError ?? categoriesQuery.error;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"MAJOR" | "RECURRING" | "EVERYDAY">("MAJOR");
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
      if (editCategoryType !== "EVERYDAY") {
        await createCategorySchedule.mutateAsync({
          categoryId: catId,
          targetAmount: parseFloat(editTarget || "0").toFixed(2),
          dueDate: editDueDate || undefined,
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
    setEditDueDate(cat.nextDueDate ? cat.nextDueDate.split("T")[0] : "");
    setEditCategoryType(cat.type as "MAJOR" | "RECURRING" | "EVERYDAY");
  };

  // Group and format based on specifications:
  // "Save Toward" (MAJOR) & "Regular Bills" (RECURRING).
  // "Everyday" categories do not get split/broken down, only shown as a summarized section.
  const saveTowardItems = categories.filter(c => c.type === "MAJOR");
  const regularBillsItems = categories.filter(c => c.type === "RECURRING");
  const everydayItems = categories.filter(c => c.type === "EVERYDAY");

  // Sum Everyday Balances
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
      </div>

      {/* Tabs / Filter Navigation */}
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
          Everyday Spending (Summarized)
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
                ${(everydayTotalBalance / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
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
                        ${(balanceVal / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
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
                          `$${(targetVal / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none"
                          />
                        ) : cat.nextDueDate ? (
                          new Date(cat.nextDueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
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
        <BucketDetailDrawer
          categoryId={selectedBucketId}
          onClose={() => {
            setSelectedBucketId(null);
            categoriesQuery.refetch();
          }}
          onResolveShortfall={(id) => {
            setSelectedBucketId(null);
            setShortfallBucketId(id);
          }}
        />
      )}

      {shortfallBucketId && (
        <ShortfallResolutionDrawer
          categoryId={shortfallBucketId}
          onClose={() => {
            setShortfallBucketId(null);
            categoriesQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
