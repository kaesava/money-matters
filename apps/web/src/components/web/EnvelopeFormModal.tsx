"use client";

import React, { useMemo } from "react";
import { useToast, ConfirmDialog, ModalDialog, Button, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { useAppFeatures } from "../../hooks/useAppFeatures";
import { EnvelopeFormFields } from "./EnvelopeFormFields";
import { useEnvelopeFormModalState, EnvelopeModalItem } from "./useEnvelopeFormModalState";

export interface EnvelopeDraftPayload {
  name: string;
  type: "EVERYDAY" | "BILL" | "GOAL";
  envelopeType: "EVERYDAY" | "BILL" | "GOAL";
  fundingMode?: "TARGET_BALANCE" | "RECURRING";
  isPriority?: boolean;
  safetyBufferFloor?: string;
  monthlyAmount?: string;
  enteredAmount?: string;
  targetAmount?: string;
  endDate?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  startDate?: string;
  rrule?: string;
  isSurplusTarget?: boolean;
  bankAccountId?: string;
  generateEvents?: boolean;
}

export interface EnvelopeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelopeToEdit?: EnvelopeModalItem | null;
  categoryToEdit?: EnvelopeModalItem | null;
  bankAccounts?: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
  onSaveDraft?: (draft: EnvelopeDraftPayload) => void;
  onSuccess?: () => void;
  initialMode?: "ALL" | "BILL_SCHEDULE";
}

export function EnvelopeFormModal({
  isOpen,
  onClose,
  envelopeToEdit,
  categoryToEdit: legacyCategoryToEdit,
  bankAccounts: passedBankAccounts,
  onSaveDraft,
  onSuccess,
  initialMode = "ALL",
}: EnvelopeFormModalProps) {
  const categoryToEdit = envelopeToEdit ?? legacyCategoryToEdit;
  const { hasPrivateMode } = useAppFeatures();
  const toast = useToast();
  const utils = trpc.useUtils();

  const isDraftMode = Boolean(onSaveDraft);
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen && !isDraftMode });
  const rawAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => passedBankAccounts ?? rawAccounts ?? [], [passedBankAccounts, rawAccounts]);

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: isOpen && !isDraftMode });
  const otherPrivateEnvelopes = useMemo(() => {
    return (poolsQuery.data || []).filter((p) => p.isPrivate && p.id !== categoryToEdit?.id);
  }, [poolsQuery.data, categoryToEdit?.id]);
  const isLastPrivateEnvelope = Boolean(categoryToEdit?.isPrivate && otherPrivateEnvelopes.length === 0);

  const createPoolMut = trpc.createEnvelope.useMutation();
  const updatePoolMut = trpc.updateEnvelope.useMutation();
  const archivePoolMut = trpc.archiveEnvelope.useMutation();

  const {
    isEdit,
    name,
    setName,
    type,
    setType,
    fundingMode,
    setFundingMode,
    bankAccountId,
    setBankAccountId,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    isPastStartDate,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    isSurplusTarget,
    setIsSurplusTarget,
    isPriority,
    setIsPriority,
    generateEvents,
    setGenerateEvents,
    submitting,
    setSubmitting,
    errorMsg,
    setErrorMsg,
    showArchiveConfirm,
    setShowArchiveConfirm,
    showRuleChangeConfirm,
    setShowRuleChangeConfirm,
    calculatedMonthly,
    isValid,
    isDirty,
    initialGenerateEvents,
    validateForm,
    isScheduleRuleChanged,
    buildPayload,
  } = useEnvelopeFormModalState({
    isOpen,
    categoryToEdit,
    bankAccounts,
  });

  const confirmArchive = async () => {
    if (!categoryToEdit?.id) return;
    try {
      await archivePoolMut.mutateAsync({ envelopeId: categoryToEdit.id });
      await Promise.all([
        utils.listEnvelopes.invalidate(),
        utils.listExpenseEvents.invalidate(),
        utils.listBillSchedules.invalidate(),
        utils.getProjectedPoolBalances.invalidate(),
      ]);
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

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
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
      if (isEdit && categoryToEdit) {
        await updatePoolMut.mutateAsync({ envelopeId: categoryToEdit.id, data: payload });
      } else {
        await createPoolMut.mutateAsync({ ...payload, bankAccountId });
      }
      await Promise.all([
        utils.listEnvelopes.invalidate(),
        utils.listExpenseEvents.invalidate(),
        utils.listBillSchedules.invalidate(),
        utils.getProjectedPoolBalances.invalidate(),
      ]);
      onSuccess?.();
      onClose();
    } catch (submitErr: unknown) {
      setErrorMsg((submitErr as Error).message || t("categories.saveFailed"));
    } finally {
      setSubmitting(false);
      setShowRuleChangeConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const err = validateForm();
    if (err) return setErrorMsg(err);

    if (isEdit && !isDraftMode && isScheduleRuleChanged) {
      setShowRuleChangeConfirm(true);
      return;
    }

    await executeSubmit();
  };

  if (!isOpen) return null;

  const isAccountSelectionDisabled = isEdit || type === "EVERYDAY";

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={
        isEdit
          ? (categoryToEdit?.name || "")
          : initialMode === "BILL_SCHEDULE"
            ? t("planTabs.addBillSchedule")
            : t("categories.createEnvelope")
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-zinc-700">
        <FormErrorBanner message={errorMsg} />

        <EnvelopeFormFields
          initialMode={initialMode}
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          fundingMode={fundingMode}
          setFundingMode={setFundingMode}
          bankAccountId={bankAccountId}
          setBankAccountId={setBankAccountId}
          bankAccountDisabled={isAccountSelectionDisabled}
          isTargetDateInPast={isTargetDateInPast}
          isPastStartDate={isPastStartDate}
          bankAccountOptions={[
            ...(!isEdit && !isAccountSelectionDisabled ? [{ value: "", label: t("categories.selectBankAccount") }] : []),
            ...bankAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name}${hasPrivateMode ? ` ${acc.isPrivate ? t("categories.privateBadge") : t("categories.householdBadge")}` : ''}`,
            })),
          ]}
          poolTypeOptions={
            isEdit
              ? [
                  { value: "EVERYDAY", label: t("categories.typeEveryday") },
                  { value: "BILL", label: t("categories.typeBill") },
                  { value: "GOAL", label: t("categories.typeGoal") },
                ]
              : [
                  { value: "BILL", label: t("categories.typeBill") },
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
          isPriority={isPriority}
          setIsPriority={setIsPriority}
          generateEvents={generateEvents}
          setGenerateEvents={setGenerateEvents}
          initialGenerateEvents={initialGenerateEvents}
          hasExistingScheduledEvents={Boolean(isEdit && categoryToEdit?.hasScheduledEvents)}
        />

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit && !isDraftMode && type !== "EVERYDAY" ? (
            categoryToEdit?.isSurplusTarget ? (
              <span
                className="px-3 py-2 text-xs font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed"
                title={t("categories.cannotArchiveSurplusTarget")}
              >
                {initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                disabled={submitting}
                title={t("categories.tooltips.archive")}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 hover:underline cursor-pointer"
              >
                {initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope")}
              </button>
            )
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
        title={initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope")}
        description={
          isLastPrivateEnvelope
            ? t("categories.archiveLastPrivatePoolConfirm", { name: categoryToEdit?.name || "" })
            : t("categories.archivePoolConfirm", { name: categoryToEdit?.name || "" })
        }
        confirmLabel={initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archiveEnvelope")}
        variant="danger"
        isLoading={submitting}
      />

      <ConfirmDialog
        isOpen={showRuleChangeConfirm}
        onClose={() => setShowRuleChangeConfirm(false)}
        onConfirm={executeSubmit}
        title={t("modals.updateSchedule.confirmTitleExpense")}
        description={
          type === "GOAL"
            ? t("categories.confirmDescConvertToGoal")
            : fundingMode === "TARGET_BALANCE"
            ? t("categories.confirmDescConvertToFlexible")
            : t("modals.updateSchedule.confirmDescRuleChange", { startDate: goalStartDate || "" })
        }
        confirmLabel={t("modals.updateSchedule.confirmCta")}
        variant="warning"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
