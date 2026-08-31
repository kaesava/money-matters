"use client";

import React, { useState } from "react";
import { SlideOverDrawer, useToast, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { CategoryItem } from "../types";

interface CategoryDrawerProps {
  poolId: string | null;
  poolName: string | null;
  onClose: () => void;
}

export function CategoryDrawer({ poolId, poolName, onClose }: CategoryDrawerProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

  const categoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: Boolean(poolId),
  });

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();
  const archiveCategoryMut = trpc.archiveCategory.useMutation();

  if (!poolId) return null;

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
    setEditingCatId(null);
    setCatName("");
    setMonthlyAmount("");
    setIsAdding(true);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setIsAdding(false);
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setMonthlyAmount(cat.monthlyAmount || "");
  };

  const handleCancelForm = () => {
    setIsAdding(false);
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
      if (isAdding) {
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

  return (
    <SlideOverDrawer
      title={poolName ? `${poolName} Categories` : "Pool Categories"}
      subtitle="Manage categories under this pool"
      onClose={onClose}
      widthClass="max-w-lg"
    >
      <div className="p-6 flex flex-col gap-6">
        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Categories ({poolCategories.length})
          </span>
          {!isAdding && !editingCatId && (
            <button
              type="button"
              onClick={handleStartAdd}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-50 text-[#2563eb] hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
            >
              + Add Category
            </button>
          )}
        </div>

        {/* Add / Edit Form */}
        {(isAdding || editingCatId) && (
          <form onSubmit={handleSave} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 animate-in fade-in">
            <h4 className="text-xs font-black text-[#1B2B4B]">
              {isAdding ? "Add New Category" : "Edit Category"}
            </h4>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Category Name</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Car Insurance, Tires, Service"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">Target Monthly Allocation ($ optional)</label>
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

        {/* Category List Table */}
        {categoriesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : poolCategories.length === 0 ? (
          <div className="py-8 text-center text-xs font-medium text-zinc-400 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
            No categories defined for this pool yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-2xl overflow-hidden bg-white">
            {poolCategories.map((cat) => (
              <div key={cat.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/50 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[#1B2B4B]">{cat.name}</span>
                  {cat.monthlyAmount && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Target: ${parseFloat(cat.monthlyAmount).toFixed(2)}/mo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(cat)}
                    className="px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatToDelete(cat)}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
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
