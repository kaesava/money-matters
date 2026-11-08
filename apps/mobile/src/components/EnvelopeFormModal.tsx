import React from "react";
import {
  MobileModalDialog,
  showMobileConfirm,
  useMobileToast,
  RecurrenceFrequency,
} from "@money-matters/ui/mobile";
import { t } from "@money-matters/i18n";
import { trpc } from "../lib/trpc";
import { useAppFeatures } from "../context/useAppFeatures";
import { EnvelopeFormFields } from "./envelopes/form/EnvelopeFormFields";
import { EnvelopeFormFooter } from "./envelopes/form/EnvelopeFormFooter";
import { useMobileEnvelopeFormState } from "./envelopes/form/useMobileEnvelopeFormState";

export interface EnvelopeItem {
  id: string;
  name: string;
  type: "GOAL" | "REGULAR" | "EVERYDAY" | string;
  poolType?: string;
  envelopeType?: string;
  targetAmount?: string | null;
  targetDate?: string | null;
  endDate?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: RecurrenceFrequency | string | null;
  startDate?: string | null;
  rrule?: string | null;
  goalMode?: "TARGET_DATE" | "ONGOING" | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
  currentBalance?: string;
  safetyBufferFloor?: string | null;
  healthStatus?: string | null;
  isSurplusTarget?: boolean | null;
  hasScheduledEvents?: boolean | null;
  isEssential?: boolean | null;
  isCommitted?: boolean | null;
  isPrivate?: boolean | null;
}

export interface EnvelopeDraftPayload {
  name: string;
  type: "GOAL" | "REGULAR" | "EVERYDAY";
  envelopeType: "EVERYDAY" | "SCHEDULED_BILL" | "FLEXIBLE_BILL" | "TARGET_GOAL" | "ONGOING_GOAL";
  monthlyAmount?: string;
  enteredAmount?: string;
  targetAmount?: string;
  endDate?: string;
  budgetFrequency?: RecurrenceFrequency;
  startDate?: string;
  rrule?: string;
  goalMode?: "TARGET_DATE" | "ONGOING";
  isSurplusTarget?: boolean;
  isEssential?: boolean;
  isCommitted?: boolean;
  bankAccountId?: string;
  generateEvents?: boolean;
}

export interface EnvelopeFormModalProps {
  visible: boolean;
  envelopeToEdit?: EnvelopeItem | null;
  categoryToEdit?: EnvelopeItem | null;
  defaultType?: "GOAL" | "REGULAR" | "EVERYDAY";
  bankAccounts?: Array<{ id: string; name: string; isPrivate?: boolean | null }>;
  onSaveDraft?: (draft: EnvelopeDraftPayload) => void;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "ALL" | "BILL_SCHEDULE";
}

export type CategoryFormModalProps = EnvelopeFormModalProps;

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

  const isDraftMode = Boolean(onSaveDraft);
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, {
    enabled: visible && !isDraftMode,
  });
  const bankAccounts = passedBankAccounts ?? bankAccountsQuery.data ?? [];

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: visible && !isDraftMode });
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
    goalMode,
    setGoalMode,
    billMode,
    setBillMode,
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
    isEssential,
    setIsEssential,
    isCommitted,
    setIsCommitted,
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
    utils.listPools.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.getProjectedPoolBalances.invalidate();
  };

  const createMut = trpc.createPool.useMutation({
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

  const updateMut = trpc.updatePool.useMutation({
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

  const archiveMut = trpc.archivePool.useMutation({
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
    if (!name.trim()) {
      setNameError(t("categories.nameRequired"));
      return false;
    }
    if (!isEdit && !bankAccountId) {
      toast.error(t("categories.bankAccountRequired"));
      return false;
    }
    if (type === "GOAL") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t("categories.goalAmountRequired"));
        return false;
      }
      if (goalMode === "TARGET_DATE" && !targetDate) {
        toast.error(t("categories.goalDateRequired"));
        return false;
      }
    }
    if (type === "REGULAR") {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error(t("categories.billAmountRequired"));
        return false;
      }
      if (billMode === "SCHEDULED_BILL" && !goalStartDate) {
        toast.error(t("categories.billStartDateRequired"));
        return false;
      }
    }
    setNameError("");
    return true;
  };

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
      updateMut.mutate({ poolId: categoryToEdit.id, data: payload });
    } else {
      createMut.mutate({ ...payload, bankAccountId });
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (isEdit && isScheduleRuleChanged) {
      showMobileConfirm({
        title: t("modals.updateSchedule.confirmTitleExpense"),
        message: t("modals.updateSchedule.confirmDescRuleChange", { startDate: goalStartDate || "" }),
        confirmText: t("modals.updateSchedule.confirmCta"),
        isDestructive: false,
        onConfirm: executeSubmit,
      });
      return;
    }
    executeSubmit();
  };

  const handleArchive = () => {
    if (!categoryToEdit) return;
    const archiveLabel =
      initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool");
    const confirmMessage = isLastPrivateEnvelope
      ? t("categories.archiveLastPrivatePoolConfirm")
      : t("categories.archivePoolConfirm", { name: categoryToEdit.name });

    showMobileConfirm({
      title: archiveLabel,
      message: confirmMessage,
      confirmText: archiveLabel,
      isDestructive: true,
      onConfirm: () => {
        archiveMut.mutate({ poolId: categoryToEdit.id });
      },
    });
  };

  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const typeOptions = isEdit
    ? [
        { key: "EVERYDAY", label: t("categories.typeEveryday") },
        { key: "REGULAR", label: t("categories.typeRegular") },
        { key: "GOAL", label: t("categories.typeGoal") },
      ]
    : [
        { key: "REGULAR", label: t("categories.typeRegular") },
        { key: "GOAL", label: t("categories.typeGoal") },
      ];

  const bankOptions = bankAccounts.map((acc) => ({
    key: acc.id,
    label: `${acc.name}${hasPrivateMode ? ` ${acc.isPrivate ? t("categories.privateBadge") : t("categories.householdBadge")}` : ''}`,
  }));

  const isBankDisabled = isEdit || type === "EVERYDAY";

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={
        isEdit
          ? (categoryToEdit?.name || "")
          : initialMode === "BILL_SCHEDULE"
            ? t("incomeBillsTabs.addBillSchedule")
            : t("categories.createPool")
      }
      footer={
        <EnvelopeFormFooter
          isEdit={isEdit}
          showArchive={isEdit && type !== "EVERYDAY"}
          archiveLabel={
            initialMode === "BILL_SCHEDULE" ? t("categories.archiveBillSchedule") : t("categories.archivePool")
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
        goalMode={goalMode}
        setGoalMode={setGoalMode}
        billMode={billMode}
        setBillMode={setBillMode}
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
        isSurplusTarget={isSurplusTarget}
        setIsSurplusTarget={setIsSurplusTarget}
        isEssential={isEssential}
        setIsEssential={setIsEssential}
        isCommitted={isCommitted}
        setIsCommitted={setIsCommitted}
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
  );
}

export const CategoryFormModal = EnvelopeFormModal;
