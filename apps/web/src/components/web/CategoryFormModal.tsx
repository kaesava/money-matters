"use client";

import React, { useState, useEffect } from "react";
import { useToast, ConfirmDialog } from "@money-matters/ui/web";
import { ModalDialog } from "./ModalDialog";

import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: {
    id: string;
    poolId?: string;
    name: string;
    type?: "EVERYDAY" | "REGULAR" | "GOAL";
    poolType?: "EVERYDAY" | "REGULAR" | "GOAL";
    isPrivate?: boolean | null;
    monthlyAmount?: string | null;
    everydayAllowanceAmount?: string | null;
    targetAmount?: string | null;
    targetDate?: string | null;
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
  const toast = useToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = bankAccountsQuery.data ?? [];
  const defaultBankAccountId = bankAccounts[0]?.id || "00000000-0000-0000-0000-000000000001";

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("REGULAR");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createPoolMut = trpc.createPool.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.poolType || categoryToEdit.type || "REGULAR");
      setMonthlyAmount(categoryToEdit.monthlyAmount || categoryToEdit.everydayAllowanceAmount || "");
      setTargetAmount(categoryToEdit.targetAmount || "");
      setTargetDate(categoryToEdit.targetDate || "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName("");
      setType("REGULAR");
      setMonthlyAmount("");
      setTargetAmount("");
      setTargetDate("");
      setIsSurplusTarget(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen]);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const confirmArchive = async () => {
    if (!categoryToEdit?.id) return;
    try {
      setSubmitting(true);
      await archivePoolMut.mutateAsync({ poolId: categoryToEdit.id });
      await utils.listPools.invalidate();
      toast.success(t("toasts.archived"));
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to archive pool.";
      toast.error(message);
    } finally {
      setSubmitting(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleArchive = () => {
    setShowArchiveConfirm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Pool name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updatePoolMut.mutateAsync({
          poolId: categoryToEdit.id,
          data: {
            name: name.trim(),
            everydayAllowanceAmount: type === "EVERYDAY" ? monthlyAmount || undefined : undefined,
            targetAmount: type === "GOAL" ? targetAmount || undefined : (type === "REGULAR" ? monthlyAmount || undefined : undefined),
            targetDate: type === "GOAL" ? targetDate || undefined : undefined,
            isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
          },
        });
      } else {
        await createPoolMut.mutateAsync({
          name: name.trim(),
          poolType: type,
          bankAccountId: defaultBankAccountId,
          everydayAllowanceAmount: type === "EVERYDAY" ? monthlyAmount || undefined : undefined,
          targetAmount: type === "GOAL" ? targetAmount || undefined : (type === "REGULAR" ? monthlyAmount || undefined : undefined),
          targetDate: type === "GOAL" ? targetDate || undefined : undefined,
          isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
        });
      }
      await utils.listPools.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save pool");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Pool — ${categoryToEdit?.name}` : "Create Financial Pool"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.categoryForm.poolName", { defaultValue: "Pool Name" })}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Utilities, House Deposit, Groceries"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.categoryForm.poolType", { defaultValue: "Pool Type" })}</label>
          <select
            value={type}
            disabled={isEdit}
            onChange={(e) => setType(e.target.value as "EVERYDAY" | "REGULAR" | "GOAL")}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="EVERYDAY">{t("modals.categoryForm.everydayPool", { defaultValue: "Everyday Spending Pool" })}</option>
            <option value="REGULAR">{t("modals.categoryForm.regularPool", { defaultValue: "Regular Bills Pool" })}</option>
            <option value="GOAL">{t("modals.categoryForm.savingsPool", { defaultValue: "Savings Goal Pool" })}</option>
          </select>
        </div>

        {type === "REGULAR" && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">Monthly Bill Target ($)</label>
            <input
              type="number"
              step="0.01"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="500.00"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        )}

        {type === "EVERYDAY" && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">Monthly Everyday Allowance ($)</label>
            <input
              type="number"
              step="0.01"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="1200.00"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        )}

        {type === "GOAL" && (
          <>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">Target Savings Goal Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="10000.00"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">Target Completion Date (Optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
          </>
        )}

        {type !== "EVERYDAY" && (
          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSurplusTarget}
              onChange={(e) => setIsSurplusTarget(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
            />
            <span className="font-bold text-zinc-800">{t("modals.categoryForm.sweepSurplus", { defaultValue: "Sweep unallocated payday surplus into this pool" })}</span>
          </label>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={submitting}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 hover:underline cursor-pointer"
            >
              {t("actions.archivePool", { defaultValue: "Archive Pool" })}
            </button>

          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50"
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEdit ? "Update Pool" : "Create Pool"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title="Archive Pool"
        description={`Are you sure you want to archive "${categoryToEdit?.name || ""}"?`}
        confirmLabel="Archive Pool"
        variant="danger"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}

