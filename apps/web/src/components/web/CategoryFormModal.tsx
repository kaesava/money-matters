"use client";
import React, { useEffect, useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";
import { InfoTooltip } from "@money-matters/ui";
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
    everydayTargetKeepAmount?: string | null;
    isEssential?: boolean | null;
    isSurplusTarget?: boolean | null;
    budgetFrequency?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccess,
}: CategoryFormModalProps) {
  const utils = trpc.useUtils();
  const { status } = useSubscriptionStatus();
  const isTrialExpired = status?.isTrialExpired ?? false;

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();

  const isEdit = !!categoryToEdit;

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
    setErrorMsg("");
  }, [categoryToEdit, isOpen]);

  const isDirty = isEdit
    ? name !== (categoryToEdit?.name || "") ||
      isPrivate !== Boolean(categoryToEdit?.isPrivate) ||
      monthlyAmount !== (categoryToEdit?.monthlyAmount || "") ||
      targetAmount !== (categoryToEdit?.targetAmount || "") ||
      targetDate !== (categoryToEdit?.targetDate || "")
    : name.trim().length > 0 ||
      monthlyAmount.length > 0 ||
      targetAmount.length > 0 ||
      targetDate.length > 0;

  const isGoalPastDate = React.useMemo(() => {
    if (type !== "GOAL" || !targetDate) return false;
    const dateObj = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateObj < today;
  }, [type, targetDate]);

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg(t("categories.nameRequired"));
      return;
    }

    const numMonthly = parseFloat(monthlyAmount);
    const numTarget = parseFloat(targetAmount);
    const numAllowance = parseFloat(everydayTargetKeepAmount);

    if (
      (monthlyAmount && (isNaN(numMonthly) || numMonthly < 0)) ||
      (targetAmount && (isNaN(numTarget) || numTarget < 0)) ||
      (everydayTargetKeepAmount && (isNaN(numAllowance) || numAllowance < 0))
    ) {
      setErrorMsg("Amount figures cannot be negative or invalid numbers.");
      return;
    }

    // Privacy confirmation warning on edit
    if (isEdit && categoryToEdit && Boolean(categoryToEdit.isPrivate) !== isPrivate) {
      const confirmMsg = isPrivate
        ? t("categories.privateTogglePrivateWarning")
        : t("categories.privateToggleSharedWarning");
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (isEdit && categoryToEdit) {
        await updateCategoryMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name,
            type,
            isPrivate,
            monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
            budgetFrequency: type === "REGULAR" ? budgetFrequency : undefined,
            targetAmount: type === "GOAL" ? targetAmount : undefined,
            targetDate: type === "GOAL" ? targetDate : undefined,
            everydayAllowanceAmount: type === "EVERYDAY" ? everydayTargetKeepAmount : undefined,
            isEssential: type === "REGULAR" ? isEssential : false,
            isSurplusTarget: type === "GOAL" ? isSurplusTarget : false,
          },
        });
      } else {
        await createCategoryMut.mutateAsync({
          name,
          type,
          isPrivate,
          monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
          budgetFrequency: type === "REGULAR" ? budgetFrequency : undefined,
          targetAmount: type === "GOAL" ? targetAmount : undefined,
          targetDate: type === "GOAL" ? targetDate : undefined,
          everydayAllowanceAmount: type === "EVERYDAY" ? everydayTargetKeepAmount : undefined,
          isEssential: type === "REGULAR" ? isEssential : false,
          isSurplusTarget: type === "GOAL" ? isSurplusTarget : false,
        });
      }

      await utils.listCategories.invalidate();
      posthog.capture(isEdit ? "category_updated" : "category_created", {
        category_type: type,
        is_private: isPrivate,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("categories.saveFailed");
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("categories.editTitle", { name: categoryToEdit.name }) : t("categories.createTitle")}
      subtitle={isEdit ? t("categories.updateSubtitle") : t("categories.createSubtitle")}
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

        {/* Pool Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.nameLabel")}
          </label>
          <input
            type="text"
            placeholder={t("categories.namePlaceholder")}
            value={name}
            disabled={type === "EVERYDAY" && name === "Everyday Incidental Buffer"}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 text-zinc-900"
          />
        </div>

        {/* Type Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.typeLabel")}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
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
              disabled={isTrialExpired && !isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
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
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Frequency
                </label>
                <select
                  value={budgetFrequency}
                  onChange={(e) =>
                    setBudgetFrequency(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY")
                  }
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
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
                onChange={(e) => setIsEssential(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded"
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
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("categories.targetDateLabel")}
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
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
                onChange={(e) => setIsSurplusTarget(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
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
              onChange={(e) => setEverydayTargetKeepAmount(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {submitting && <Spinner size="sm" />}
            {isEdit ? t("common.saveChanges") : t("categories.createButton")}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
