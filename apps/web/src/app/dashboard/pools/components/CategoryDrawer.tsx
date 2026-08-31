"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOverDrawer, useToast, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { CategoryItem, PoolTableRow } from "../types";

interface CategoryDrawerProps {
  pool: PoolTableRow | null;
  onClose: () => void;
  onEditCategory?: (cat: CategoryItem) => void;
  onAddCategory?: (poolId: string) => void;
}

export function CategoryDrawer({ pool, onClose, onEditCategory, onAddCategory }: CategoryDrawerProps) {
  const toast = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [isAddingInline, setIsAddingInline] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

  const poolId = pool?.id ?? null;

  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: Boolean(poolId),
  });

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();
  const archiveCategoryMut = trpc.archiveCategory.useMutation();

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

  const handleStartAdd = () => {
    if (onAddCategory) {
      onAddCategory(pool.id);
      return;
    }
    setEditingCatId(null);
    setCatName("");
    setMonthlyAmount("");
    setIsAddingInline(true);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    if (onEditCategory) {
      onEditCategory(cat);
      return;
    }
    setIsAddingInline(false);
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setMonthlyAmount(cat.monthlyAmount || "");
  };

  const handleCancelForm = () => {
    setIsAddingInline(false);
    setEditingCatId(null);
    setCatName("");
    setMonthlyAmount("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isAddingInline) {
        await createCategoryMut.mutateAsync({
          poolId,
          name: catName.trim(),
          monthlyAmount: monthlyAmount.trim() || undefined,
        });
        toast.success("Category created successfully.");
      } else if (editingCatId) {
        await updateCategoryMut.mutateAsync({
          categoryId: editingCatId,
          data: {
            name: catName.trim(),
            monthlyAmount: monthlyAmount.trim() || undefined,
          },
        });
        toast.success("Category updated successfully.");
      }

      await utils.listCategories.invalidate();
      await utils.listPools.invalidate();
      handleCancelForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;
    try {
      setSubmitting(true);
      await archiveCategoryMut.mutateAsync({ categoryId: catToDelete.id });
      await utils.listCategories.invalidate();
      await utils.listPools.invalidate();
      toast.success(t("toasts.archived"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setCatToDelete(null);
    }
  };

  const handleGoToCategoryHistory = (categoryName: string) => {
    router.push(`/dashboard/history?search=${encodeURIComponent(categoryName)}`);
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
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Private
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
            <div>
              <span className="text-zinc-400 font-semibold block text-[11px]">Current Balance</span>
              <span className="font-mono font-black text-[#1B2B4B]">
                ${pool.currentBalance.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Categories Section Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Pool Categories ({poolCategories.length})
          </span>
          {!isAddingInline && !editingCatId && (
            <button
              type="button"
              onClick={handleStartAdd}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-[#2563eb] text-white hover:bg-blue-700 transition-all cursor-pointer shadow-2xs"
            >
              + Add Category
            </button>
          )}
        </div>

        {/* Add / Edit Inline Form (Fallback) */}
        {(isAddingInline || editingCatId) && (
          <form onSubmit={handleSave} className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
            <h4 className="text-xs font-black text-[#1B2B4B]">
              {isAddingInline ? "Add New Category" : "Edit Category"}
            </h4>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Category Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Electricity, Groceries"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Monthly Target Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        )}

        {/* Categories Table */}
        {categoriesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : poolCategories.length === 0 ? (
          <div className="py-10 text-center text-xs font-medium text-zinc-400 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
            No categories defined for this pool yet.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4 text-right">Monthly Target</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {poolCategories.map((cat) => (
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleGoToCategoryHistory(cat.name)}
                          className="px-2 py-1 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer border border-zinc-200"
                          title="View history for this category"
                        >
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatToDelete(cat)}
                          className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(catToDelete)}
        onClose={() => setCatToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Archive Category"
        description={`Are you sure you want to archive "${catToDelete?.name || ""}"?`}
        confirmLabel="Archive Category"
        variant="danger"
        isLoading={submitting}
      />
    </SlideOverDrawer>
  );
}
