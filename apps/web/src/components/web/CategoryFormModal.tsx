"use client";
import React, { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";

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
    } else {
      setName("");
      setType("REGULAR");
      setMonthlyAmount("");
      setTargetAmount("");
      setTargetDate("");
      setBankAccountId("");
      setEverydayTargetKeepAmount("");
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
      setErrorMsg("Category name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (isEdit && categoryToEdit) {
        await updateCategoryMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name: type === "EVERYDAY" ? "Everyday" : name,
            bankAccountId: bankAccountId || undefined,
            monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
            targetAmount: type === "GOAL" ? targetAmount : undefined,
            targetDate: type === "GOAL" ? targetDate : undefined,
            everydayTargetKeepAmount: type === "EVERYDAY" ? everydayTargetKeepAmount : undefined,
          },
        });
      } else {
        await createCategoryMut.mutateAsync({
          name,
          type,
          bankAccountId: bankAccountId || undefined,
          monthlyAmount: type === "REGULAR" ? monthlyAmount : undefined,
          targetAmount: type === "GOAL" ? targetAmount : undefined,
          targetDate: type === "GOAL" ? targetDate : undefined,
        });
      }

      await utils.listCategories.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Category: ${categoryToEdit.name}` : "Create New Category"}
      subtitle={isEdit ? "Update category specifications" : "Add a new savings target or regular obligation"}
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
            Category Name
          </label>
          <input
            type="text"
            placeholder="e.g. Groceries, Netflix, Emergency Fund"
            value={name}
            disabled={type === "EVERYDAY"}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 text-zinc-900"
          />
        </div>

        {/* Type Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Category Type
          </label>
          <select
            value={type}
            disabled={isEdit || type === "EVERYDAY"}
            onChange={(e) => setType(e.target.value as any)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] disabled:bg-zinc-100 text-zinc-900"
          >
            <option value="REGULAR">Regular Bill (Recurring obligation)</option>
            <option value="GOAL">Save Toward (Target savings pool)</option>
            {type === "EVERYDAY" && <option value="EVERYDAY">Everyday Spending</option>}
          </select>
        </div>

        {/* Type-Specific Fields */}
        {type === "REGULAR" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Monthly Amount ($)
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
        )}

        {type === "GOAL" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Target ($)
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
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
              />
            </div>
          </div>
        )}

        {type === "EVERYDAY" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Target Keep Amount ($)
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
            Linked Bank Account (Optional)
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
          >
            <option value="">-- No Account Linked --</option>
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Category"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
