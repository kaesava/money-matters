"use client";
import React, { useEffect, useState, useMemo } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";
import { InfoTooltip } from "@money-matters/ui";
import { authClient } from "../../lib/auth";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";

export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: {
    id: string;
    name: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    isPrivate?: boolean | null;
    monthlyAmount?: string | null;
    targetAmount?: string | null;
    targetDate?: string | null;
    everydayAllowanceAmount?: string | null;
    everydayTargetKeepAmount?: string | null;
    isEssential?: boolean | null;
    isSurplusTarget?: boolean | null;
    budgetFrequency?: string | null;
    userId?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccess,
}: CategoryFormModalProps) {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();
  const archiveCategoryMut = trpc.archiveCategory.useMutation();

  const handleArchive = async () => {
    if (!categoryToEdit?.id) return;
    if (window.confirm(`Are you sure you want to archive "${categoryToEdit.name}"?`)) {
      try {
        setSubmitting(true);
        await archiveCategoryMut.mutateAsync({ categoryId: categoryToEdit.id });
        await utils.listCategories.invalidate();
        onSuccess?.();
        onClose();
      } catch (err: unknown) {
        alert((err as Error).message || "Failed to archive pool");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isEdit = !!categoryToEdit;
  const isReadOnly = isEdit && Boolean(categoryToEdit?.isPrivate) && Boolean(categoryToEdit?.userId) && session?.user?.id !== categoryToEdit?.userId;

  const [name, setName] = useState("");
  const [type, setType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [isPrivate, setIsPrivate] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [budgetFrequency, setBudgetFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [everydayTargetKeepAmount, setEverydayTargetKeepAmount] = useState("");
  const [isEssential, setIsEssential] = useState(false);
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setType(categoryToEdit.type || "REGULAR");
      setIsPrivate(Boolean(categoryToEdit.isPrivate));
      setMonthlyAmount(categoryToEdit.monthlyAmount || "");
      setBudgetFrequency(
        (categoryToEdit.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || "MONTHLY"
      );
      setTargetAmount(categoryToEdit.targetAmount || "");
      setTargetDate(categoryToEdit.targetDate || "");
      setEverydayTargetKeepAmount(categoryToEdit.everydayTargetKeepAmount || "");
      setIsEssential(Boolean(categoryToEdit.isEssential));
      setIsSurplusTarget(Boolean(categoryToEdit.isSurplusTarget));
    } else {
      setName("");
      setType("REGULAR");
      setIsPrivate(false);
      setMonthlyAmount("");
      setBudgetFrequency("MONTHLY");
      setTargetAmount("");
      setTargetDate("");
      setEverydayTargetKeepAmount("");
      setIsEssential(false);
      setIsSurplusTarget(false);
    }
  }, [categoryToEdit, isOpen]);

  const isGoalPastDate = type === "GOAL" && targetDate && new Date(targetDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(
        name.trim() ||
          monthlyAmount ||
          targetAmount ||
          targetDate ||
          everydayTargetKeepAmount ||
          isPrivate ||
          isEssential ||
          isSurplusTarget
      );
    }
    return (
      name !== (categoryToEdit?.name || "") ||
      type !== (categoryToEdit?.type || "REGULAR") ||
      isPrivate !== Boolean(categoryToEdit?.isPrivate) ||
      monthlyAmount !== (categoryToEdit?.monthlyAmount || "") ||
      budgetFrequency !== (categoryToEdit?.budgetFrequency || "MONTHLY") ||
      targetAmount !== (categoryToEdit?.targetAmount || "") ||
      targetDate !== (categoryToEdit?.targetDate || "") ||
      everydayTargetKeepAmount !== (categoryToEdit?.everydayTargetKeepAmount || "") ||
      isEssential !== Boolean(categoryToEdit?.isEssential) ||
      isSurplusTarget !== Boolean(categoryToEdit?.isSurplusTarget)
    );
  }, [
    isEdit,
    categoryToEdit,
    name,
    type,
    isPrivate,
    monthlyAmount,
    budgetFrequency,
    targetAmount,
    targetDate,
    everydayTargetKeepAmount,
    isEssential,
    isSurplusTarget,
  ]);

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg(t("categories.nameRequired"));
      return;
    }
    setErrorMsg("");

    // Confirmation if converting to or from private pool
    if (isEdit && categoryToEdit && Boolean(categoryToEdit.isPrivate) !== isPrivate) {
      const confirmMsg = isPrivate
        ? "Making this pool PRIVATE will hide it and all its transactions from your partner. Continue?"
        : "Making this pool PUBLIC will make it visible to your household partner. Continue?";
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updateCategoryMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name: name.trim(),
            type,
            isPrivate,
            monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
            budgetFrequency: type === "REGULAR" ? budgetFrequency : undefined,
            targetAmount: type === "GOAL" ? targetAmount : undefined,
            targetDate: type === "GOAL" ? targetDate : undefined,
            everydayAllowanceAmount: type === "EVERYDAY" ? everydayTargetKeepAmount : undefined,
            isEssential: type === "REGULAR" ? isEssential : undefined,
            isSurplusTarget: type === "GOAL" ? isSurplusTarget : undefined,
          },
        });
      } else {
        await createCategoryMut.mutateAsync({
          name: name.trim(),
          type,
          isPrivate,
          monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
          budgetFrequency: type === "REGULAR" ? budgetFrequency : undefined,
          targetAmount: type === "GOAL" ? targetAmount : undefined,
          targetDate: type === "GOAL" ? targetDate : undefined,
          everydayAllowanceAmount: type === "EVERYDAY" ? everydayTargetKeepAmount : undefined,
          isEssential: type === "REGULAR" ? isEssential : undefined,
          isSurplusTarget: type === "GOAL" ? isSurplusTarget : undefined,
        });
      }
      
      await utils.listCategories.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("categories.editTitle", { name: categoryToEdit.name }) : t("categories.createTitle")}
      subtitle={isReadOnly ? "Read-only. Only the owner can edit this private pool." : (isEdit ? t("categories.updateSubtitle") : t("categories.createSubtitle"))}
      isDirty={isDirty}
      onSave={handleSave}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4"
      >
        {errorMsg && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {isReadOnly && (
          <div className="p-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
            You are not the owner of this private pool. You cannot modify its details or privacy settings.
          </div>
        )}

        {/* Pool Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.nameLabel")}
          </label>
          <input
            type="text"
            placeholder={t("categories.namePlaceholder")}
            value={name}
            disabled={(type === "EVERYDAY" && name === "Everyday Incidental Buffer") || isReadOnly}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
          />
        </div>

        {/* Type Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.typeLabel")}
          </label>
          <select
            value={type}
            disabled={isReadOnly}
            onChange={(e) => setType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
          >
            <option value="REGULAR">{t("categories.typeRegular")}</option>
            <option value="GOAL">{t("categories.typeGoal")}</option>
            <option value="EVERYDAY">{t("categories.typeEveryday")}</option>
          </select>
        </div>

        {/* 🔒 Private Pool Toggle */}
        <div className="flex flex-col gap-1 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
            <input
              type="checkbox"
              checked={isPrivate}
              disabled={(isTrialExpired && !isPrivate) || isReadOnly}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 disabled:opacity-75"
            />
            <span>{t("categories.privatePoolLabel")}</span>
            <InfoTooltip content={t("categories.privatePoolTooltip")} />
          </label>
          {isTrialExpired && !isPrivate && (
            <p className="text-[10px] text-amber-700 font-semibold pl-6">
              🔒 Private pools require an active premium trial or subscription.
            </p>
          )}
        </div>

        {/* Type-Specific Fields */}
        {type === "REGULAR" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={monthlyAmount}
                  disabled={isReadOnly}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Frequency
                </label>
                <select
                  value={budgetFrequency}
                  disabled={isReadOnly}
                  onChange={(e) =>
                    setBudgetFrequency(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY")
                  }
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 bg-slate-50 p-3 rounded-xl border border-zinc-200">
              <input
                type="checkbox"
                checked={isEssential}
                disabled={isReadOnly}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded disabled:opacity-75"
              />
              {t("categories.priorityBillLabel")}
            </label>
          </div>
        )}

        {type === "GOAL" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("categories.targetAmountLabel")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={targetAmount}
                  disabled={isReadOnly}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("categories.targetDateLabel")}
                </label>
                <input
                  type="date"
                  value={targetDate}
                  disabled={isReadOnly}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
                />
              </div>
            </div>

            {isGoalPastDate && (
              <div className="p-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
                {t("categories.goalPastDateWarning")}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <input
                type="checkbox"
                checked={isSurplusTarget}
                disabled={isReadOnly}
                onChange={(e) => setIsSurplusTarget(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded disabled:opacity-75"
              />
              🏦 Surplus Sweep Target (Sweeps leftover everyday spending cash into this pool on payday)
            </label>
          </div>
        )}

        {type === "EVERYDAY" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Monthly Allowance Cap ($)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 500.00"
              value={everydayTargetKeepAmount}
              disabled={isReadOnly}
              onChange={(e) => setEverydayTargetKeepAmount(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 disabled:opacity-75 text-zinc-900"
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
          {isEdit && !isReadOnly && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={submitting}
              className="text-xs font-semibold text-zinc-400 hover:text-red-600 transition-colors py-1 px-2 rounded-lg"
            >
              Archive Pool
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || isReadOnly}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-zinc-400 disabled:opacity-75"
            >
              {submitting && <Spinner size="sm" />}
              {isEdit ? t("common.saveChanges") : t("categories.createButton")}
            </button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
