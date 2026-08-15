"use client";
import React, { useEffect, useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";
import { ModalDialog } from "./ModalDialog";
import { Spinner } from "@money-matters/ui/web";

export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: {
    id: string;
    name: string;
    type: "REGULAR" | "GOAL" | "EVERYDAY";
    monthlyAmount?: string | null;
    targetAmount?: string | null;
    targetDate?: string | null;
    bankAccountId?: string | null;
    everydayTargetKeepAmount?: string | null;
    isEssential?: boolean | null;
    isSurplusTarget?: boolean | null;
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
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const bankAccounts = bankAccountsQuery.data ?? [];

  const createCategoryMut = trpc.createCategory.useMutation();
  const updateCategoryMut = trpc.updateCategory.useMutation();

  const isEdit = !!categoryToEdit;

  const [name, setName] = useState("");
  const [type, setType] = useState<"REGULAR" | "GOAL" | "EVERYDAY">("REGULAR");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [everydayTargetKeepAmount, setEverydayTargetKeepAmount] = useState("");
  const [isEssential, setIsEssential] = useState(false);
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setType(categoryToEdit.type || "REGULAR");
      setMonthlyAmount(categoryToEdit.monthlyAmount || "");
      setTargetAmount(categoryToEdit.targetAmount || "");
      setTargetDate(categoryToEdit.targetDate || "");
      setBankAccountId(categoryToEdit.bankAccountId || "");
      setEverydayTargetKeepAmount(categoryToEdit.everydayTargetKeepAmount || "");
      setIsEssential(Boolean(categoryToEdit.isEssential));
      setIsSurplusTarget(Boolean(categoryToEdit.isSurplusTarget));
    } else {
      setName("");
      setType("REGULAR");
      setMonthlyAmount("");
      setTargetAmount("");
      setTargetDate("");
      setBankAccountId("");
      setEverydayTargetKeepAmount("");
      setIsEssential(false);
      setIsSurplusTarget(false);
    }
    setErrorMsg("");

  }, [categoryToEdit, isOpen]);

  const isDirty = isEdit
    ? name !== (categoryToEdit?.name || "") ||
      monthlyAmount !== (categoryToEdit?.monthlyAmount || "") ||
      targetAmount !== (categoryToEdit?.targetAmount || "") ||
      targetDate !== (categoryToEdit?.targetDate || "") ||
      bankAccountId !== (categoryToEdit?.bankAccountId || "")
    : name.trim().length > 0 ||
      monthlyAmount.length > 0 ||
      targetAmount.length > 0 ||
      targetDate.length > 0;

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg(t("categories.nameRequired"));
      return;
    }

    const numMonthly = parseFloat(monthlyAmount);
    const numTarget = parseFloat(targetAmount);
    const numAllowance = parseFloat(everydayTargetKeepAmount);

    if ((monthlyAmount && (isNaN(numMonthly) || numMonthly < 0)) ||
        (targetAmount && (isNaN(numTarget) || numTarget < 0)) ||
        (everydayTargetKeepAmount && (isNaN(numAllowance) || numAllowance < 0))) {
      setErrorMsg("Amount figures cannot be negative or invalid numbers.");
      return;
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
            monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
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
          monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
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
        has_linked_bank_account: Boolean(bankAccountId),
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

        {/* Category Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.nameLabel")}
          </label>
          <input
            type="text"
            placeholder={t("categories.namePlaceholder")}
            value={name}
            disabled={type === "EVERYDAY"}
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

        {/* Type-Specific Fields */}
        {type === "REGULAR" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {t("categories.monthlyAmountLabel")}
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
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 bg-slate-50 p-3 rounded-xl border border-zinc-200">
              <input
                type="checkbox"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="w-4 h-4 text-[#2563eb] rounded"
              />
              ⭐ Essential Priority Bill (Funded first every payday before standard bills)
            </label>
          </div>
        )}

        {type === "GOAL" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("categories.targetLabel")}
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
              {t("categories.targetKeepLabel")}
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


        {/* Linked Bank Account */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {t("categories.linkedAccountLabel")}
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
          >
            <option value="">{t("categories.noAccountLinked")}</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

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
