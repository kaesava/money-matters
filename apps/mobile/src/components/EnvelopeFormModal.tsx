import React, { useState } from "react";
import {
  MobileModalDialog,
  FormErrorBanner,
  showMobileConfirm,
  useMobileToast,
} from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { trpc } from "../lib/trpc";
import { useAppFeatures } from "../context/useAppFeatures";
import { EnvelopeFormFields } from "./envelopes/form/EnvelopeFormFields";
import { EnvelopeFormFooter } from "./envelopes/form/EnvelopeFormFooter";
import { useMobileEnvelopeFormState } from "./envelopes/form/useMobileEnvelopeFormState";
import { CrossBankTransferModal } from "./CrossBankTransferModal";
import { formatMobileCurrency } from "../lib/format";

import type { EnvelopeItem, EnvelopeDraftPayload, EnvelopeFormModalProps } from "./envelopes/form/envelopeFormTypes";
export type { EnvelopeItem, EnvelopeDraftPayload, EnvelopeFormModalProps };

export function EnvelopeFormModal({
  visible,
  envelopeToEdit,
  categoryToEdit: legacyCategoryToEdit,
  defaultType,
  bankAccounts: passedBankAccounts,
  onSaveDraft,
  onClose,
  onSuccess,
  initialMode = "ALL",
}: EnvelopeFormModalProps) {
  const categoryToEdit = envelopeToEdit ?? legacyCategoryToEdit;
  const { hasPrivateMode } = useAppFeatures();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [crossBankPrompt, setCrossBankPrompt] = useState<{
    sourceAccountName: string; destAccountName: string; amount: number;
  } | null>(null);

  const isDraftMode = Boolean(onSaveDraft);
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, {
    enabled: visible && !isDraftMode,
  });
  const bankAccounts = passedBankAccounts ?? bankAccountsQuery.data ?? [];

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: visible && !isDraftMode });
  const otherPrivateEnvelopes = (poolsQuery.data || []).filter((p) => p.isPrivate && p.id !== categoryToEdit?.id);
  const isLastPrivateEnvelope = Boolean(categoryToEdit?.isPrivate && otherPrivateEnvelopes.length === 0);

  const {
    isEdit,
    name,
    setName,
    nameError,
    setNameError,
    type,
    setType,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    isPastStartDate,
    fundingMode,
    setFundingMode,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    bankAccountId,
    setBankAccountId,
    isSurplusTarget,
    setIsSurplusTarget,
    isPriority,
    setIsPriority,
    generateEvents,
    setGenerateEvents,
    calculatedMonthly,
    isValid,
    isDirty,
    initialGenerateEvents,
    isScheduleRuleChanged,
    buildPayload,
  } = useMobileEnvelopeFormState({
    categoryToEdit,
    defaultType,
    visible,
    bankAccounts,
  });

  const invalidateQueries = () => {
    utils.listEnvelopes.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listBillSchedules.invalidate();
    utils.getProjectedPoolBalances.invalidate();
  };

  const createMut = trpc.createEnvelope.useMutation({
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("toasts.created"));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t("categories.saveFailed"));
    },
  });

  const updateMut = trpc.updateEnvelope.useMutation({
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("toasts.saved"));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t("categories.saveFailed"));
    },
  });

  const archiveMut = trpc.archiveEnvelope.useMutation({
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("toasts.archived"));
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t("categories.failedToArchive"));
    },
  });

  const validateForm = (): boolean => {
    setErrorMsg(null);
    if (!name.trim()) {
      setNameError(t("categories.nameRequired"));
      setErrorMsg(t("categories.nameRequired"));
      return false;
    }
    if (!isEdit && !bankAccountId) {
      setErrorMsg(t("categories.bankAccountRequired"));
      return false;
    }
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        setErrorMsg(t("categories.goalAmountRequired"));
        return false;
      }
      if (fundingMode === "TARGET_BALANCE" && !targetDate) {
        setErrorMsg(t("categories.goalDateRequired"));
        return false;
      }
    }
    if (type === "BILL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        setErrorMsg(t("categories.billAmountRequired"));
        return false;
      }
      if (fundingMode === "RECURRING" && !goalStartDate) {
        setErrorMsg(t("categories.billStartDateRequired"));
        return false;
      }
    }
    if (goalStartDate && targetDate && targetDate < goalStartDate) {
      setErrorMsg(t("categories.endDateBeforeStartDate"));
      return false;
    }
    setNameError("");
    return true;
  };

  const initialBankAccountId = categoryToEdit?.bankAccountId || "";
  const isBankAccountChanged = Boolean(isEdit && !isDraftMode && bankAccountId && bankAccountId !== initialBankAccountId);
  const currentBalanceNum = Number(categoryToEdit?.currentBalance ?? 0);
  const hasPositiveBalance = Number.isFinite(currentBalanceNum) && currentBalanceNum > 0;
  const oldAcc = bankAccounts.find((a) => a.id === initialBankAccountId);
  const newAcc = bankAccounts.find((a) => a.id === bankAccountId);

  const executeSubmit = () => {
    const payload = buildPayload();
    if (isDraftMode && onSaveDraft) {
      onSaveDraft({
        ...payload,
        type,
        bankAccountId: bankAccountId || bankAccounts[0]?.id,
      });
      toast.success(t("toasts.created"));
      onSuccess?.();
      onClose();
      return;
    }
    if (categoryToEdit) {
      updateMut.mutate(
        { envelopeId: categoryToEdit.id, data: payload },
        {
          onSuccess: () => {
            if (isBankAccountChanged && hasPositiveBalance && oldAcc && newAcc) {
              setCrossBankPrompt({
                sourceAccountName: oldAcc.name,
                destAccountName: newAcc.name,
                amount: currentBalanceNum,
              });
            }
          },
        }
      );
    } else {
      createMut.mutate({ ...payload, bankAccountId });
    }
  };

  const confirmBankChangeIfNeeded = () => {
    if (isBankAccountChanged && hasPositiveBalance && oldAcc && newAcc) {
      showMobileConfirm({
        title: t("categories.bankChangeConfirmTitle"),
        message: t("categories.bankChangeConfirmMessage", {
          amount: formatMobileCurrency(currentBalanceNum),
          fromBank: oldAcc.name,
          toBank: newAcc.name,
        }),
        confirmText: t("categories.bankChangeConfirmCta"),
        isDestructive: false,
        onConfirm: executeSubmit,
      });
      return;
    }
    executeSubmit();
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (isEdit && !isDraftMode && isScheduleRuleChanged) {
      const wasRecurring = (categoryToEdit?.fundingMode ?? (categoryToEdit?.envelopeType === "GOAL" ? "TARGET_BALANCE" : "RECURRING")) === "RECURRING";
      const isConvertingToFlexible = wasRecurring && fundingMode === "TARGET_BALANCE";
      showMobileConfirm({
        title: t("modals.updateSchedule.confirmTitleExpense"),
        message: isConvertingToFlexible
          ? t("modals.updateSchedule.confirmDescConvertToFlexible")
          : t("modals.updateSchedule.confirmDescRuleChange", { startDate: goalStartDate || "" }),
        confirmText: t("modals.updateSchedule.confirmCta"),
        isDestructive: false,
        onConfirm: confirmBankChangeIfNeeded,
      });
      return;
    }
    confirmBankChangeIfNeeded();
  };

  const handleArchive = () => {
    if (!categoryToEdit) return;
    const archiveLabel =
      initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope");
    const confirmMessage = isLastPrivateEnvelope
      ? t("categories.archiveLastPrivatePoolConfirm", { name: categoryToEdit.name })
      : t("categories.archivePoolConfirm", { name: categoryToEdit.name });

    showMobileConfirm({
      title: archiveLabel,
      message: confirmMessage,
      confirmText: archiveLabel,
      isDestructive: true,
      onConfirm: () => {
        archiveMut.mutate({ envelopeId: categoryToEdit.id });
      },
    });
  };

  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const typeOptions = isEdit
    ? [
        { key: "EVERYDAY", label: t("categories.typeEveryday") },
        { key: "BILL", label: t("categories.typeBill") },
        { key: "GOAL", label: t("categories.typeGoal") },
      ]
    : [
        { key: "BILL", label: t("categories.typeBill") },
        { key: "GOAL", label: t("categories.typeGoal") },
      ];

  const eligibleAccounts = isEdit && categoryToEdit
    ? bankAccounts.filter((acc) => Boolean(acc.isPrivate) === Boolean(categoryToEdit.isPrivate))
    : bankAccounts;

  const bankOptions = eligibleAccounts.map((acc) => ({
    key: acc.id,
    label: `${acc.name}${hasPrivateMode ? ` ${acc.isPrivate ? t("categories.privateBadge") : t("categories.householdBadge")}` : ''}`,
  }));

  const isBankDisabled = isEdit ? eligibleAccounts.length <= 1 : type === "EVERYDAY";

  return (
    <>
      <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={
        isEdit
          ? (categoryToEdit?.name || "")
          : initialMode === "BILL_SCHEDULE"
            ? t("planTabs.addBillSchedule")
            : t("categories.createEnvelope")
      }
      footer={
        <EnvelopeFormFooter
          isEdit={isEdit}
          showArchive={isEdit && !isDraftMode && type !== "EVERYDAY"}
          archiveLabel={
            initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope")
          }
          isSurplusTarget={Boolean(categoryToEdit?.isSurplusTarget)}
          isPending={isPending}
          isValid={isValid}
          isDirty={isDirty}
          onArchive={handleArchive}
          onSubmit={handleSubmit}
        />
      }
    >
      <FormErrorBanner message={errorMsg} />
      <EnvelopeFormFields
        name={name}
        setName={setName}
        nameError={nameError}
        setNameError={setNameError}
        type={type}
        setType={setType}
        safetyBufferFloor={safetyBufferFloor}
        setSafetyBufferFloor={setSafetyBufferFloor}
        targetAmount={targetAmount}
        setTargetAmount={setTargetAmount}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        fundingMode={fundingMode}
        setFundingMode={setFundingMode}
        frequency={frequency}
        setFrequency={setFrequency}
        interval={interval}
        setInterval={setInterval}
        goalStartDate={goalStartDate}
        setGoalStartDate={setGoalStartDate}
        endDate={targetDate}
        setEndDate={setTargetDate}
        calculatedMonthly={calculatedMonthly}
        bankAccountId={bankAccountId}
        setBankAccountId={setBankAccountId}
        bankDisabled={isBankDisabled}
        isTargetDateInPast={isTargetDateInPast}
        isPastStartDate={isPastStartDate}
        isSurplusTarget={isSurplusTarget}
        setIsSurplusTarget={setIsSurplusTarget}
        isPriority={isPriority}
        setIsPriority={setIsPriority}
        isEdit={isEdit}
        isSurplusDisabled={Boolean(isEdit && categoryToEdit?.isSurplusTarget)}
        hideTypeOptions={initialMode === "BILL_SCHEDULE"}
        hideBillModeToggle={initialMode === "BILL_SCHEDULE"}
        generateEvents={generateEvents}
        setGenerateEvents={setGenerateEvents}
        initialGenerateEvents={initialGenerateEvents}
        hasExistingScheduledEvents={Boolean(isEdit && categoryToEdit?.hasScheduledEvents)}
        typeOptions={typeOptions}
        bankOptions={bankOptions}
      />
    </MobileModalDialog>
    <CrossBankTransferModal
      visible={!!crossBankPrompt}
      onClose={() => setCrossBankPrompt(null)}
      sourceAccountName={crossBankPrompt?.sourceAccountName ?? ""}
      destAccountName={crossBankPrompt?.destAccountName ?? ""}
      amount={crossBankPrompt?.amount ?? 0}
    />
    </>
  );
}
