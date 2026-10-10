"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, ConfirmDialog, ModalDialog, Button, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { CategoryFormFields } from "./CategoryFormFields";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: {
    id: string; poolId?: string; name: string;
    type?: "EVERYDAY" | "REGULAR" | "GOAL"; poolType?: "EVERYDAY" | "REGULAR" | "GOAL";
    bankAccountId?: string | null; isPrivate?: boolean | null; monthlyAmount?: string | null;
    everydayAllowanceAmount?: string | null; safetyBufferFloor?: string | null;
    targetAmount?: string | null; targetDate?: string | null; goalMode?: "TARGET_DATE" | "ONGOING";
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
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalMode, setGoalMode] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");
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
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor || "");
      setTargetAmount(categoryToEdit.targetAmount || "");
      setTargetDate(categoryToEdit.targetDate || "");
      setGoalMode(categoryToEdit.goalMode || "TARGET_DATE");
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName("");
      setType("REGULAR");
      setBankAccountId("");
      setSafetyBufferFloor("");
      setTargetAmount("");
      setTargetDate("");
      setGoalMode("TARGET_DATE");
      setIsSurplusTarget(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen]);

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (goalMode === "TARGET_DATE" && !targetDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, targetAmount, goalMode, targetDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) return Boolean(name.trim() && bankAccountId);
    if (!categoryToEdit) return false;
    return (
      name.trim() !== (categoryToEdit.name || "") ||
      safetyBufferFloor !== (categoryToEdit.safetyBufferFloor || "") ||
      targetAmount !== (categoryToEdit.targetAmount || "") ||
      targetDate !== (categoryToEdit.targetDate || "") ||
      goalMode !== (categoryToEdit.goalMode || "TARGET_DATE") ||
      isSurplusTarget !== (categoryToEdit.isSurplusTarget ?? false)
    );
  }, [isEdit, categoryToEdit, name, bankAccountId, safetyBufferFloor, targetAmount, targetDate, goalMode, isSurplusTarget]);

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
      toast.error(err instanceof Error ? err.message : t("categories.failedToArchive"));
    } finally {
      setSubmitting(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) return setErrorMsg(t("categories.nameRequired"));
    if (!isEdit && !bankAccountId) return setErrorMsg(t("categories.bankAccountRequired"));
    if (type === "GOAL" && (!targetAmount || parseFloat(targetAmount) <= 0)) {
      return setErrorMsg(t("categories.goalAmountRequired"));
    }
    if (type === "GOAL" && goalMode === "TARGET_DATE" && !targetDate) {
      return setErrorMsg(t("categories.goalDateRequired"));
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updatePoolMut.mutateAsync({
          poolId: categoryToEdit.id,
          data: {
            name: name.trim(),
            safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
            targetAmount: type === "GOAL" ? targetAmount || undefined : undefined,
            targetDate: type === "GOAL" && goalMode === "TARGET_DATE" ? targetDate || undefined : undefined,
            goalMode: type === "GOAL" ? goalMode : undefined,
            isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
          },
        });
      } else {
        await createPoolMut.mutateAsync({
          name: name.trim(),
          poolType: type,
          bankAccountId,
          safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
          targetAmount: type === "GOAL" ? targetAmount || undefined : undefined,
          targetDate: type === "GOAL" && goalMode === "TARGET_DATE" ? targetDate || undefined : undefined,
          goalMode: type === "GOAL" ? goalMode : undefined,
          isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
        });
      }
      await utils.listPools.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || t("categories.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t("categories.editPoolTitle", { name: categoryToEdit?.name || "" }) : t("categories.createPool")}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-zinc-700">
        <FormErrorBanner message={errorMsg} />

        <CategoryFormFields
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          bankAccountId={bankAccountId}
          setBankAccountId={setBankAccountId}
          bankAccountOptions={[
            ...(!isEdit ? [{ value: "", label: t("categories.selectBankAccount") }] : []),
            ...bankAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name} ${acc.isPrivate ? t("categories.privateBadge") : t("categories.householdBadge")}`,
            })),
          ]}
          poolTypeOptions={[
            { value: "EVERYDAY", label: t("categories.typeEveryday") },
            { value: "REGULAR", label: t("categories.typeRegular") },
            { value: "GOAL", label: t("categories.typeGoal") },
          ]}
          isEdit={isEdit}
          safetyBufferFloor={safetyBufferFloor}
          setSafetyBufferFloor={setSafetyBufferFloor}
          targetAmount={targetAmount}
          setTargetAmount={setTargetAmount}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          goalMode={goalMode}
          setGoalMode={setGoalMode}
          isSurplusTarget={isSurplusTarget}
          setIsSurplusTarget={setIsSurplusTarget}
          isSurplusDisabled={Boolean(isEdit && categoryToEdit?.isSurplusTarget)}
        />

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={submitting}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 hover:underline cursor-pointer"
            >
              {t("categories.archivePool")}
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              {t("categories.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !isDirty || !isValid} loading={submitting}>
              {t("categories.savePool")}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={t("categories.archivePool")}
        description={t("categories.archivePoolConfirm", { name: categoryToEdit?.name || "" })}
        confirmLabel={t("categories.archivePool")}
        variant="danger"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
