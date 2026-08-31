"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
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
    bankAccountId?: string | null;
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

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("REGULAR");
  const [bankAccountId, setBankAccountId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const createPoolMut = trpc.createPool.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.poolType || categoryToEdit.type || "REGULAR");
      setBankAccountId(categoryToEdit.bankAccountId || "");
      setTargetAmount(categoryToEdit.targetAmount || "");
      setTargetDate(categoryToEdit.targetDate || "");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName("");
      setType("REGULAR");
      setBankAccountId(""); // Mandatory: No pre-selection
      setTargetAmount("");
      setTargetDate("");
      setIsSurplusTarget(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen]);

  // Compute if form state is dirty (has changes)
  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(name.trim() && bankAccountId);
    }
    if (!categoryToEdit) return false;
    const initialName = categoryToEdit.name || "";
    const initialTarget = categoryToEdit.targetAmount || "";
    const initialDate = categoryToEdit.targetDate || "";
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;

    return (
      name.trim() !== initialName ||
      targetAmount !== initialTarget ||
      targetDate !== initialDate ||
      isSurplusTarget !== initialSurplus
    );
  }, [isEdit, categoryToEdit, name, bankAccountId, targetAmount, targetDate, isSurplusTarget]);

  const isSurplusDisabled = Boolean(isEdit && categoryToEdit?.isSurplusTarget);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Pool name is required.");
      return;
    }

    if (!isEdit && !bankAccountId) {
      setErrorMsg("Bank Account selection is mandatory.");
      return;
    }

    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        setErrorMsg("Goal amount is required for Goal pools and must be greater than $0.");
        return;
      }
      if (!targetDate) {
        setErrorMsg("Completion date is required for Goal pools.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updatePoolMut.mutateAsync({
          poolId: categoryToEdit.id,
          data: {
            name: name.trim(),
            targetAmount: type === "GOAL" ? targetAmount || undefined : undefined,
            targetDate: type === "GOAL" ? targetDate || undefined : undefined,
            isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
          },
        });
      } else {
        await createPoolMut.mutateAsync({
          name: name.trim(),
          poolType: type,
          bankAccountId: bankAccountId,
          targetAmount: type === "GOAL" ? targetAmount || undefined : undefined,
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
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.poolNameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Utilities, House Deposit, Groceries"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            autoFocus
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.poolTypeLabel")}</label>
          <select
            value={type}
            disabled={isEdit}
            onChange={(e) => setType(e.target.value as "EVERYDAY" | "REGULAR" | "GOAL")}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-zinc-100 disabled:text-zinc-500 cursor-pointer"
          >
            <option value="EVERYDAY">{t("categories.typeEveryday")}</option>
            <option value="REGULAR">{t("categories.typeRegular")}</option>
            <option value="GOAL">{t("categories.typeGoal")}</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.linkedAccountLabel")}</label>
          <select
            value={bankAccountId}
            disabled={isEdit}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] disabled:bg-zinc-100 disabled:text-zinc-500 cursor-pointer"
          >
            {!isEdit && <option value="">{t("categories.selectBankAccount")}</option>}
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.isPrivate ? "(Private)" : "(Household)"}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed font-semibold">
            {t("categories.immutabilityWarning")}
          </div>
        )}

        {(type === "REGULAR" || type === "EVERYDAY") && (
          <div className="p-3 bg-slate-50 border border-zinc-200 rounded-xl text-zinc-600 text-[11px] leading-relaxed">
            <span className="font-bold text-[#1B2B4B] block mb-0.5">{t("categories.calculatedTarget")}</span>
            {t("categories.calculatedTargetNotice")}
          </div>
        )}

        {type === "GOAL" && (
          <>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.targetAmountLabel")}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="10000.00"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("categories.targetCompletionDate")}</label>
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
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSurplusTarget}
                disabled={isSurplusDisabled}
                onChange={(e) => setIsSurplusTarget(e.target.checked)}
                className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
              />
              <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                <span>{t("categories.sweepSurplus")}</span>
                <InfoTooltip content={t("categories.shortfallTargetTooltip")} />
              </span>
            </label>
            {isSurplusDisabled && (
              <p className="text-[11px] text-zinc-500 mt-1 pl-6">
                {t("categories.shortfallTargetDisabledWarning")}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t("categories.archivePool")}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
            >
              {t("categories.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !isDirty}
              className="px-5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Saving..." : t("categories.savePool")}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={t("categories.archivePool")}
        description={`Are you sure you want to archive "${categoryToEdit?.name || ""}"? All linked categories in this pool will also be archived.`}
        confirmLabel={t("categories.archivePool")}
        variant="danger"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
