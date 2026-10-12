"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, ConfirmDialog, ModalDialog, Button, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { EnvelopeFormFields } from "./EnvelopeFormFields";

export interface EnvelopeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeToEdit?: {
    id: string; poolId?: string; name: string;
    type?: "EVERYDAY" | "REGULAR" | "GOAL" | string; poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
    envelopeType?: string;
    bankAccountId?: string | null; isPrivate?: boolean | null; monthlyAmount?: string | null;
    safetyBufferFloor?: string | null;
    targetAmount?: string | null; endDate?: string | null; targetDate?: string | null; goalMode?: "TARGET_DATE" | "ONGOING" | null;
    enteredAmount?: string | null; budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
    startDate?: string | null; rrule?: string | null;
    isSurplusTarget?: boolean | null;
  } | null;
  categoryToEdit?: {
    id: string; poolId?: string; name: string;
    type?: "EVERYDAY" | "REGULAR" | "GOAL" | string; poolType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
    envelopeType?: string;
    bankAccountId?: string | null; isPrivate?: boolean | null; monthlyAmount?: string | null;
    safetyBufferFloor?: string | null;
    targetAmount?: string | null; endDate?: string | null; targetDate?: string | null; goalMode?: "TARGET_DATE" | "ONGOING" | null;
    enteredAmount?: string | null; budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | string | null;
    startDate?: string | null; rrule?: string | null;
    isSurplusTarget?: boolean | null;
  } | null;
  onSuccess?: () => void;
}

export type CategoryFormModalProps = EnvelopeFormModalProps;

export function EnvelopeFormModal({
  isOpen,
  onClose,
  envelopeToEdit,
  categoryToEdit: legacyCategoryToEdit,
  onSuccess,
}: EnvelopeFormModalProps) {
  const categoryToEdit = envelopeToEdit ?? legacyCategoryToEdit;
  const toast = useToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const isEdit = Boolean(categoryToEdit?.id);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EVERYDAY" | "REGULAR" | "GOAL">("REGULAR");
  const [billMode, setBillMode] = useState<"SCHEDULED_BILL" | "FLEXIBLE_BILL">("SCHEDULED_BILL");
  const [bankAccountId, setBankAccountId] = useState("");
  const [safetyBufferFloor, setSafetyBufferFloor] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalMode, setGoalMode] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [interval, setInterval] = useState<number>(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [isSurplusTarget, setIsSurplusTarget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const createPoolMut = trpc.createPool.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
      const resolvedType: "EVERYDAY" | "REGULAR" | "GOAL" =
        rawType === "EVERYDAY" ? "EVERYDAY" : rawType === "TARGET_GOAL" || rawType === "ONGOING_GOAL" || rawType.includes("GOAL") ? "GOAL" : "REGULAR";
      setType(resolvedType);
      setBillMode(rawType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL");
      setBankAccountId(categoryToEdit.bankAccountId || "");
      setSafetyBufferFloor(categoryToEdit.safetyBufferFloor || "");
      setTargetAmount(categoryToEdit.enteredAmount || categoryToEdit.targetAmount || categoryToEdit.monthlyAmount || "");
      const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
      setTargetDate(rawDate ? rawDate.split("T")[0] : "");
      setGoalMode(categoryToEdit.goalMode === "ONGOING" || rawType === "ONGOING_GOAL" ? "ONGOING" : "TARGET_DATE");
      setFrequency((categoryToEdit.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || "MONTHLY");
      const rawStartDate = categoryToEdit.startDate || "";
      setGoalStartDate(rawStartDate ? rawStartDate.split("T")[0] : "");
      if (categoryToEdit.rrule) {
        const match = categoryToEdit.rrule.match(/INTERVAL=(\d+)/);
        setInterval(match ? parseInt(match[1], 10) : 1);
      } else {
        setInterval(1);
      }
      setIsSurplusTarget(categoryToEdit.isSurplusTarget ?? false);
    } else {
      setName("");
      setType("REGULAR");
      setBillMode("SCHEDULED_BILL");
      setBankAccountId("");
      setSafetyBufferFloor("");
      setTargetAmount("");
      setTargetDate("");
      setGoalMode("TARGET_DATE");
      setFrequency("MONTHLY");
      setInterval(1);
      setGoalStartDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()));
      setIsSurplusTarget(false);
    }
    setErrorMsg(null);
  }, [categoryToEdit, isOpen]);

  const calculatedMonthly = useMemo(() => {
    const val = parseFloat(targetAmount);
    if (isNaN(val) || val <= 0) return "0.00";
    const intVal = Math.max(1, interval);
    let monthly = val;
    if (frequency === "WEEKLY") monthly = (val * (52 / intVal)) / 12;
    else if (frequency === "FORTNIGHTLY") monthly = (val * (26 / intVal)) / 12;
    else if (frequency === "MONTHLY") monthly = val / intVal;
    else if (frequency === "ANNUALLY") monthly = val / (12 * intVal);
    return monthly.toFixed(2);
  }, [targetAmount, frequency, interval]);

  const rruleString = useMemo(() => {
    const isScheduledBill = type === "REGULAR" && billMode === "SCHEDULED_BILL";
    const isOngoingGoal = type === "GOAL" && goalMode === "ONGOING";
    if (!isScheduledBill && !isOngoingGoal) return null;
    let freqStr = "FREQ=MONTHLY";
    let intVal = Math.max(1, interval);
    if (frequency === "WEEKLY") freqStr = "FREQ=WEEKLY";
    if (frequency === "FORTNIGHTLY") {
      freqStr = "FREQ=WEEKLY";
      intVal = intVal * 2;
    }
    if (frequency === "ANNUALLY") freqStr = "FREQ=YEARLY";
    return intVal > 1 ? `${freqStr};INTERVAL=${intVal}` : freqStr;
  }, [type, billMode, goalMode, frequency, interval]);

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!isEdit && !bankAccountId) return false;
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (goalMode === "TARGET_DATE" && !targetDate) return false;
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return false;
      if (billMode === "SCHEDULED_BILL" && !goalStartDate) return false;
    }
    return true;
  }, [name, isEdit, bankAccountId, type, billMode, targetAmount, goalMode, targetDate, goalStartDate]);

  const isDirty = useMemo(() => {
    if (!isEdit) {
      return Boolean(
        name.trim() ||
        bankAccountId ||
        safetyBufferFloor.trim() ||
        targetAmount.trim() ||
        targetDate ||
        isSurplusTarget ||
        type !== "REGULAR" ||
        billMode !== "SCHEDULED_BILL" ||
        goalMode !== "TARGET_DATE" ||
        frequency !== "MONTHLY" ||
        interval !== 1
      );
    }
    if (!categoryToEdit) return false;
    const initialName = (categoryToEdit.name || "").trim();
    const rawType = categoryToEdit.envelopeType || categoryToEdit.poolType || categoryToEdit.type || "REGULAR";
    const initialBillMode = rawType === "FLEXIBLE_BILL" ? "FLEXIBLE_BILL" : "SCHEDULED_BILL";
    const initialGoalMode = categoryToEdit.goalMode === "ONGOING" || rawType === "ONGOING_GOAL" ? "ONGOING" : "TARGET_DATE";
    const initialFloor = (categoryToEdit.safetyBufferFloor || "").trim();
    const initialTarget = (categoryToEdit.enteredAmount || categoryToEdit.targetAmount || categoryToEdit.monthlyAmount || "").trim();
    const rawDate = categoryToEdit.endDate || categoryToEdit.targetDate || "";
    const initialDate = rawDate ? rawDate.split("T")[0] : "";
    const initialFreq = categoryToEdit.budgetFrequency || "MONTHLY";
    const rawStartDate = categoryToEdit.startDate || "";
    const initialStartDate = rawStartDate ? rawStartDate.split("T")[0] : "";
    let initialInterval = 1;
    if (categoryToEdit.rrule) {
      const match = categoryToEdit.rrule.match(/INTERVAL=(\d+)/);
      initialInterval = match ? parseInt(match[1], 10) : 1;
    }
    const initialSurplus = categoryToEdit.isSurplusTarget ?? false;

    return (
      name.trim() !== initialName ||
      billMode !== initialBillMode ||
      goalMode !== initialGoalMode ||
      safetyBufferFloor.trim() !== initialFloor ||
      targetAmount.trim() !== initialTarget ||
      targetDate !== initialDate ||
      frequency !== initialFreq ||
      interval !== initialInterval ||
      goalStartDate !== initialStartDate ||
      isSurplusTarget !== initialSurplus
    );
  }, [
    isEdit,
    categoryToEdit,
    name,
    billMode,
    bankAccountId,
    safetyBufferFloor,
    targetAmount,
    targetDate,
    goalMode,
    frequency,
    interval,
    goalStartDate,
    isSurplusTarget,
    type,
  ]);

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

  const validateForm = (): string | null => {
    if (!name.trim()) return t("categories.nameRequired");
    if (!isEdit && !bankAccountId) return t("categories.bankAccountRequired");
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.goalAmountRequired");
      if (goalMode === "TARGET_DATE" && !targetDate) return t("categories.goalDateRequired");
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) return t("categories.billAmountRequired");
      if (billMode === "SCHEDULED_BILL" && !goalStartDate) return t("categories.billStartDateRequired");
    }
    return null;
  };

  const buildPayload = () => {
    const isScheduledBill = type === "REGULAR" && billMode === "SCHEDULED_BILL";
    const isFlexibleBill = type === "REGULAR" && billMode === "FLEXIBLE_BILL";
    const isOngoingGoal = type === "GOAL" && goalMode === "ONGOING";
    const isTargetGoal = type === "GOAL" && goalMode === "TARGET_DATE";

    const finalTargetAmount = isTargetGoal || isFlexibleBill
      ? parseFloat(targetAmount).toFixed(2)
      : isScheduledBill || isOngoingGoal
      ? calculatedMonthly
      : undefined;

    const enteredAmountVal = (isScheduledBill || isFlexibleBill || isOngoingGoal)
      ? parseFloat(targetAmount).toFixed(2)
      : undefined;

    const envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL" =
      type === "EVERYDAY"
        ? "EVERYDAY"
        : type === "GOAL"
        ? goalMode === "ONGOING"
          ? "ONGOING_GOAL"
          : "TARGET_GOAL"
        : billMode === "FLEXIBLE_BILL"
        ? "FLEXIBLE_BILL"
        : "SCHEDULED_BILL";

    return {
      name: name.trim(),
      envelopeType,
      safetyBufferFloor: type === "EVERYDAY" ? safetyBufferFloor || "0.00" : undefined,
      targetAmount: finalTargetAmount,
      monthlyAmount: isFlexibleBill ? finalTargetAmount : isScheduledBill ? calculatedMonthly : undefined,
      enteredAmount: enteredAmountVal,
      endDate: isTargetGoal ? targetDate || undefined : undefined,
      budgetFrequency: (isScheduledBill || isOngoingGoal) ? frequency : isFlexibleBill ? "MONTHLY" : undefined,
      startDate: (isScheduledBill || isOngoingGoal) ? goalStartDate || undefined : undefined,
      rrule: (isScheduledBill || isOngoingGoal) ? rruleString || undefined : undefined,
      goalMode: type === "GOAL" ? goalMode : undefined,
      isSurplusTarget: type !== "EVERYDAY" ? isSurplusTarget : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const err = validateForm();
    if (err) return setErrorMsg(err);

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isEdit && categoryToEdit) {
        await updatePoolMut.mutateAsync({ poolId: categoryToEdit.id, data: payload });
      } else {
        await createPoolMut.mutateAsync({ ...payload, bankAccountId });
      }
      await utils.listPools.invalidate();
      onSuccess?.();
      onClose();
    } catch (submitErr: unknown) {
      setErrorMsg((submitErr as Error).message || t("categories.saveFailed"));
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

        <EnvelopeFormFields
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          billMode={billMode}
          setBillMode={setBillMode}
          bankAccountId={bankAccountId}
          setBankAccountId={setBankAccountId}
          bankAccountOptions={[
            ...(!isEdit ? [{ value: "", label: t("categories.selectBankAccount") }] : []),
            ...bankAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name} ${acc.isPrivate ? t("categories.privateBadge") : t("categories.householdBadge")}`,
            })),
          ]}
          poolTypeOptions={
            isEdit
              ? [
                  { value: "EVERYDAY", label: t("categories.typeEveryday") },
                  { value: "REGULAR", label: t("categories.typeRegular") },
                  { value: "GOAL", label: t("categories.typeGoal") },
                ]
              : [
                  { value: "REGULAR", label: t("categories.typeRegular") },
                  { value: "GOAL", label: t("categories.typeGoal") },
                ]
          }
          isEdit={isEdit}
          safetyBufferFloor={safetyBufferFloor}
          setSafetyBufferFloor={setSafetyBufferFloor}
          targetAmount={targetAmount}
          setTargetAmount={setTargetAmount}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          goalMode={goalMode}
          setGoalMode={setGoalMode}
          frequency={frequency}
          setFrequency={setFrequency}
          interval={interval}
          setInterval={setInterval}
          goalStartDate={goalStartDate}
          setGoalStartDate={setGoalStartDate}
          calculatedMonthly={calculatedMonthly}
          isSurplusTarget={isSurplusTarget}
          setIsSurplusTarget={setIsSurplusTarget}
          isSurplusDisabled={Boolean(isEdit && categoryToEdit?.isSurplusTarget)}
        />

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit && type !== "EVERYDAY" ? (
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

export const CategoryFormModal = EnvelopeFormModal;
