"use client";

import React, { useMemo } from "react";
import { useToast, ConfirmDialog, ModalDialog, Button, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { EnvelopeFormFields } from "./EnvelopeFormFields";
import { useEnvelopeFormModalState, EnvelopeModalItem } from "./useEnvelopeFormModalState";

export interface EnvelopeDraftPayload {
  name: string;
  type: "EVERYDAY" | "REGULAR" | "GOAL";
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  monthlyAmount?: string;
  enteredAmount?: string;
  targetAmount?: string;
  endDate?: string;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  startDate?: string;
  rrule?: string;
  goalMode?: "TARGET_DATE" | "ONGOING";
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

export type CategoryFormModalProps = EnvelopeFormModalProps;

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
  const toast = useToast();
  const utils = trpc.useUtils();

  const isDraftMode = Boolean(onSaveDraft);
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen && !isDraftMode });
  const rawAccounts = bankAccountsQuery.data;
  const bankAccounts = useMemo(() => passedBankAccounts ?? rawAccounts ?? [], [passedBankAccounts, rawAccounts]);

  const createPoolMut = trpc.createPool.useMutation();
  const updatePoolMut = trpc.updatePool.useMutation();
  const archivePoolMut = trpc.archivePool.useMutation();

  const {
    isEdit,
    name,
    setName,
    type,
    setType,
    billMode,
    setBillMode,
    bankAccountId,
    setBankAccountId,
    safetyBufferFloor,
    setSafetyBufferFloor,
    targetAmount,
    setTargetAmount,
    targetDate,
    setTargetDate,
    isTargetDateInPast,
    goalMode,
    setGoalMode,
    frequency,
    setFrequency,
    interval,
    setInterval,
    goalStartDate,
    setGoalStartDate,
    isSurplusTarget,
    setIsSurplusTarget,
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
      await archivePoolMut.mutateAsync({ poolId: categoryToEdit.id });
      await Promise.all([
        utils.listPools.invalidate(),
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
        await updatePoolMut.mutateAsync({ poolId: categoryToEdit.id, data: payload });
      } else {
        await createPoolMut.mutateAsync({ ...payload, bankAccountId });
      }
      await Promise.all([
        utils.listPools.invalidate(),
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

    if (isEdit && isScheduleRuleChanged) {
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
        initialMode === "BILL_SCHEDULE"
          ? isEdit
            ? t("incomeBillsTabs.editBillSchedule")
            : t("incomeBillsTabs.addBillSchedule")
          : isEdit
            ? t("categories.editPoolTitle", { name: categoryToEdit?.name || "" })
            : t("categories.createPool")
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
          billMode={billMode}
          setBillMode={setBillMode}
          bankAccountId={bankAccountId}
          setBankAccountId={setBankAccountId}
          bankAccountDisabled={isAccountSelectionDisabled}
          isTargetDateInPast={isTargetDateInPast}
          bankAccountOptions={[
            ...(!isEdit && !isAccountSelectionDisabled ? [{ value: "", label: t("categories.selectBankAccount") }] : []),
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
          generateEvents={generateEvents}
          setGenerateEvents={setGenerateEvents}
          initialGenerateEvents={initialGenerateEvents}
          hasExistingScheduledEvents={Boolean(isEdit && categoryToEdit?.hasScheduledEvents)}
        />

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
          {isEdit && type !== "EVERYDAY" ? (
            categoryToEdit?.isSurplusTarget ? (
              <span
                className="px-3 py-2 text-xs font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed"
                title={t("categories.cannotArchiveSurplusTarget")}
              >
                {initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                disabled={submitting}
                title={t("categories.tooltips.archive")}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 hover:underline cursor-pointer"
              >
                {initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool")}
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
        title={initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool")}
        description={t("categories.archivePoolConfirm", { name: categoryToEdit?.name || "" })}
        confirmLabel={initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool")}
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
            : billMode === "FLEXIBLE_BILL"
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

export const CategoryFormModal = EnvelopeFormModal;
