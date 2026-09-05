"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, ConfirmDialog } from "@money-matters/ui/web";
import { ModalDialog } from "./ModalDialog";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { CategoryItem } from "../../app/dashboard/pools/types";

interface CategoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryItem | null;
  initialPoolId?: string | null;
  onSuccess?: () => void;
}

type FrequencyOption = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";

export function CategoryItemModal({
  isOpen,
  onClose,
  categoryToEdit,
  initialPoolId,
  onSuccess,
}: CategoryItemModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  // Filter out Goal pools as categories are only for Everyday/Bills pools
  const availablePools = useMemo(() => {
    return (poolsQuery.data ?? []).filter((p) => p.poolType !== "GOAL");
  }, [poolsQuery.data]);

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [enteredAmount, setEnteredAmount] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption>("MONTHLY");
  const [isEssential, setIsEssential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();
  const archiveCategoryMut = trpc.archiveCategory.useMutation();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setSelectedPoolId(categoryToEdit.poolId);
      setEnteredAmount(categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || "");
      setFrequency((categoryToEdit.budgetFrequency as FrequencyOption) || "MONTHLY");
      setIsEssential(categoryToEdit.isEssential ?? false);
    } else {
      setName("");
      setSelectedPoolId(initialPoolId || availablePools[0]?.id || "");
      setEnteredAmount("");
      setFrequency("MONTHLY");
      setIsEssential(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen, initialPoolId, availablePools]);

  // Compute calculated monthly amount for display
  const calculatedMonthly = useMemo(() => {
    const val = parseFloat(enteredAmount);
    if (isNaN(val) || val <= 0) return "0.00";
    let monthly = val;
    if (frequency === "WEEKLY") monthly = (val * 52) / 12;
    else if (frequency === "FORTNIGHTLY") monthly = (val * 26) / 12;
    else if (frequency === "ANNUALLY") monthly = val / 12;
    return monthly.toFixed(2);
  }, [enteredAmount, frequency]);

  // Check if form is dirty (has modifications)
  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(name.trim() && selectedPoolId && enteredAmount && parseFloat(enteredAmount) > 0);
    }
    if (!categoryToEdit) return false;
    const origName = categoryToEdit.name || "";
    const origPool = categoryToEdit.poolId || "";
    const origAmount = categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || "";
    const origFreq = (categoryToEdit.budgetFrequency as FrequencyOption) || "MONTHLY";
    const origEssential = categoryToEdit.isEssential ?? false;

    return (
      name.trim() !== origName ||
      selectedPoolId !== origPool ||
      enteredAmount !== origAmount ||
      frequency !== origFreq ||
      isEssential !== origEssential
    );
  }, [isEdit, categoryToEdit, name, selectedPoolId, enteredAmount, frequency, isEssential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Category name is required.");
      return;
    }
    if (!selectedPoolId) {
      setErrorMsg("Target pool is required.");
      return;
    }
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
      setErrorMsg("Target amount is required and must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updateCategoryMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name: name.trim(),
            monthlyAmount: calculatedMonthly,
            enteredAmount: enteredAmount.trim() || undefined,
            budgetFrequency: frequency,
            isEssential,
          },
        });
        toast.success("Category updated successfully.");
      } else {
        await createCategoryMut.mutateAsync({
          poolId: selectedPoolId,
          name: name.trim(),
          monthlyAmount: calculatedMonthly,
          enteredAmount: enteredAmount.trim() || undefined,
          budgetFrequency: frequency,
          isEssential,
        });
        toast.success("Category created successfully.");
      }
      await utils.listCategories.invalidate();
      await utils.listPools.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmArchive = async () => {
    if (!categoryToEdit?.id) return;
    try {
      setSubmitting(true);
      await archiveCategoryMut.mutateAsync({ categoryId: categoryToEdit.id });
      await utils.listCategories.invalidate();
      await utils.listPools.invalidate();
      toast.success(t("toasts.archived"));
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to archive category.";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setShowArchiveConfirm(false);
    }
  };

  const isValid = name.trim() !== "" && selectedPoolId !== "" && enteredAmount !== "" && parseFloat(enteredAmount) > 0;

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? `Edit Category — ${categoryToEdit?.name}` : t("categories.addCategory")}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">
            {t("categories.nameLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries, Electricity, Fuel"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            autoFocus
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">
            {t("categories.targetPoolLabel")} <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPoolId}
            disabled={isEdit}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="" disabled>{t("categories.selectPool")}</option>
            {availablePools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.poolType === "EVERYDAY" ? "Everyday" : "Bills"})
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed font-semibold">
            {t("categories.immutabilityWarning", { defaultValue: "Pool type and linked bank account cannot be changed once created." })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">
              {t("categories.targetAmountLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={enteredAmount}
              onChange={(e) => setEnteredAmount(e.target.value)}
              placeholder="150.00"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.frequencyLabel")}</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FrequencyOption)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="WEEKLY">{t("categories.frequencyWeekly")}</option>
              <option value="FORTNIGHTLY">{t("categories.frequencyFortnightly")}</option>
              <option value="MONTHLY">{t("categories.frequencyMonthly")}</option>
              <option value="ANNUALLY">{t("categories.frequencyAnnually")}</option>
            </select>
          </div>
        </div>

        {enteredAmount && parseFloat(enteredAmount) > 0 && frequency !== "MONTHLY" && (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center justify-between font-mono">
            <span>{t("categories.monthlyEquivalent")}</span>
            <span className="font-bold text-[#2563eb]">${calculatedMonthly} / mo</span>
          </div>
        )}

        <label className="flex items-center gap-2 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isEssential}
            onChange={(e) => setIsEssential(e.target.checked)}
            className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
          />
          <span className="font-bold text-zinc-800">{t("categories.prioritiseCategory")}</span>
        </label>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={submitting}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 hover:underline cursor-pointer"
            >
              {t("categories.archiveCategory")}
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50"
            >
              {t("categories.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !isDirty || !isValid}
              className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Saving..." : t("categories.saveCategory")}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={t("categories.archiveCategory")}
        description={`Are you sure you want to archive "${categoryToEdit?.name || ""}"?`}
        confirmLabel={t("categories.archiveCategory")}
        variant="danger"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
