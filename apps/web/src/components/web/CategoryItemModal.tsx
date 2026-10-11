"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, ConfirmDialog, ModalDialog, Button, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { CategoryItem } from "../../app/dashboard/envelopes/types";
import { CategoryItemFormFields, FrequencyOption } from "./CategoryItemFormFields";

interface CategoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryItem | null;
  initialPoolId?: string | null;
  limitToPoolType?: "REGULAR" | "EVERYDAY";
  onSuccess?: () => void;
}

function getDefaultStartDateAest(): string {
  const d = new Date();
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(nextMonth);
}

export function CategoryItemModal({
  isOpen,
  onClose,
  categoryToEdit,
  initialPoolId,
  limitToPoolType: _limitToPoolType,
  onSuccess,
}: CategoryItemModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const defaultBankAccountId = bankAccountsQuery.data?.[0]?.id || "";

  const availablePools = useMemo(() => {
    return (poolsQuery.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      poolType: p.envelopeType,
    })).filter((p) => {
      if (p.poolType === "TARGET_GOAL" || p.poolType === "ONGOING_GOAL") return false;
      return true;
    });
  }, [poolsQuery.data]);

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [enteredAmount, setEnteredAmount] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption>("MONTHLY");
  const [startDate, setStartDate] = useState(getDefaultStartDateAest());
  const [isEssential, setIsEssential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const createEnvelopeMut = trpc.createEnvelope.useMutation();
  const updateEnvelopeMut = trpc.updateEnvelope.useMutation();
  const archiveEnvelopeMut = trpc.archiveEnvelope.useMutation();

  const activePool = availablePools.find((p) => p.id === selectedPoolId);
  const isBillsPool = activePool?.poolType === "SCHEDULED_BILL" || activePool?.poolType === "FLEXIBLE_BILL";

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setSelectedPoolId(categoryToEdit.poolId || "");
      setEnteredAmount(categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || "");
      setFrequency((categoryToEdit.budgetFrequency as FrequencyOption) || "MONTHLY");
      setIsEssential(categoryToEdit.isEssential ?? false);
    } else {
      setName("");
      setSelectedPoolId(initialPoolId || availablePools[0]?.id || "");
      setEnteredAmount("");
      setFrequency("MONTHLY");
      setStartDate(getDefaultStartDateAest());
      setIsEssential(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen, initialPoolId, availablePools]);

  const calculatedMonthly = useMemo(() => {
    const val = parseFloat(enteredAmount);
    if (isNaN(val) || val <= 0) return "0.00";
    let monthly = val;
    if (frequency === "WEEKLY") monthly = (val * 52) / 12;
    else if (frequency === "FORTNIGHTLY") monthly = (val * 26) / 12;
    else if (frequency === "ANNUALLY") monthly = val / 12;
    return monthly.toFixed(2);
  }, [enteredAmount, frequency]);

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

    if (!name.trim()) return setErrorMsg(t("categories.nameRequired"));
    if (!selectedPoolId) return setErrorMsg(t("categories.targetPoolRequired"));
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) return setErrorMsg(t("categories.targetAmountRequired"));

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit) {
        await updateEnvelopeMut.mutateAsync({
          envelopeId: categoryToEdit.id,
          data: {
            name: name.trim(),
            monthlyAmount: calculatedMonthly,
            enteredAmount: enteredAmount.trim() || undefined,
            budgetFrequency: frequency,
            startDate: isBillsPool ? startDate : undefined,
            isEssential,
          },
        });
        toast.success(t("categories.updatedSuccess"));
      } else {
        await createEnvelopeMut.mutateAsync({
          bankAccountId: defaultBankAccountId,
          name: name.trim(),
          envelopeType: isBillsPool ? "SCHEDULED_BILL" : "EVERYDAY",
          monthlyAmount: calculatedMonthly,
          enteredAmount: enteredAmount.trim() || undefined,
          budgetFrequency: frequency,
          startDate: isBillsPool ? startDate : undefined,
          isEssential,
        });
        toast.success(t("categories.createdSuccess"));
      }
      await utils.listPools.invalidate();
      await utils.listBillSchedules.invalidate();
      await utils.listExpenseEvents.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || t("categories.failedToSave"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmArchive = async () => {
    if (!categoryToEdit?.id) return;
    try {
      setSubmitting(true);
      await archiveEnvelopeMut.mutateAsync({ envelopeId: categoryToEdit.id });
      await utils.listPools.invalidate();
      await utils.listBillSchedules.invalidate();
      await utils.listExpenseEvents.invalidate();
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

  const isValid = name.trim() !== "" && selectedPoolId !== "" && enteredAmount !== "" && parseFloat(enteredAmount) > 0;

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? `${t("actions.editCategory")} — ${categoryToEdit?.name}` : t("categories.createTitle")}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-zinc-700">
        <FormErrorBanner message={errorMsg} />

        <CategoryItemFormFields
          name={name}
          setName={setName}
          selectedPoolId={selectedPoolId}
          setSelectedPoolId={setSelectedPoolId}
          availablePools={availablePools}
          isEdit={isEdit}
          isBillsPool={isBillsPool}
          enteredAmount={enteredAmount}
          setEnteredAmount={setEnteredAmount}
          frequency={frequency}
          setFrequency={setFrequency}
          startDate={startDate}
          setStartDate={setStartDate}
          calculatedMonthly={calculatedMonthly}
          isEssential={isEssential}
          setIsEssential={setIsEssential}
        />

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
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              {t("categories.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !isDirty || !isValid} loading={submitting}>
              {t("categories.saveCategory")}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={t("categories.archiveCategory")}
        description={t("categories.archiveCategoryConfirm", { name: categoryToEdit?.name || "" })}
        confirmLabel={t("categories.archiveCategory")}
        variant="danger"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
