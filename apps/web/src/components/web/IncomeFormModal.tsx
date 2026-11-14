"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, RecurrenceBuilder, useRecurrenceBuilder, ConfirmDialog, Button, AmountField, ModalDialog, Input, GenericSelectField, FormErrorBanner, FormLabel, parseRecurrenceRule } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { useLocale } from "../../providers/LocaleProvider";

export interface IncomeSourceToEdit {
  id: string;
  name: string;
  amount: string;
  receivingAccountId?: string;
  rrule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  interval?: number | null;
  contributionMode?: "FULL" | "PERCENTAGE" | "FIXED_AMOUNT";
  contributionValue?: string | null;
}

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceToEdit?: IncomeSourceToEdit;
}

function cleanAmount(val: string): string {
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? "0.00" : num.toFixed(2);
}
export function IncomeFormModal({ isOpen, onClose, sourceToEdit }: IncomeFormModalProps) {
  const { currency, currencySymbol, minorUnits } = useLocale();
  const toast = useToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: isOpen });
  const hasPrivateEnvelopes = useMemo(() => (poolsQuery.data || []).some((e) => e.isPrivate), [poolsQuery.data]);

  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

  const isEdit = !!sourceToEdit;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [contributionMode, setContributionMode] = useState<"FULL" | "PERCENTAGE" | "FIXED_AMOUNT">("FULL");
  const [contributionValue, setContributionValue] = useState("");

  const recurrenceBuilder = useRecurrenceBuilder();
  const { frequency, isRecurring, interval, startDate, endDate, setStartDate, setEndDate, setIsRecurring, setFrequency, setInterval } = recurrenceBuilder;

  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const [showRuleChangeConfirm, setShowRuleChangeConfirm] = useState(false);

  const { userTimezone, timezone } = useLocale();
  const activeTz = userTimezone || timezone || "UTC";

  const toTenantDateString = React.useCallback(
    (iso: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: activeTz }).format(new Date(iso)),
    [activeTz]
  );

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || "");
      setAmount(sourceToEdit.amount || "");
      setReceivingAccountId(sourceToEdit.receivingAccountId || "");
      setContributionMode(sourceToEdit.contributionMode || "FULL");
      setContributionValue(sourceToEdit.contributionValue ? String(sourceToEdit.contributionValue) : "");
      const parsed = parseRecurrenceRule(sourceToEdit.rrule);
      setIsRecurring(parsed.isRecurring || !!sourceToEdit.startDate);
      setFrequency(parsed.frequency);
      setInterval(parsed.interval);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: activeTz }).format(new Date());
      setStartDate(sourceToEdit.startDate ? toTenantDateString(sourceToEdit.startDate) : today);
      setEndDate(sourceToEdit.endDate ? toTenantDateString(sourceToEdit.endDate) : null);
    } else {
      setName("");
      setAmount("");
      setReceivingAccountId(bankAccounts[0]?.id || "");
      setContributionMode("FULL");
      setContributionValue("");
      setIsRecurring(true);
      setFrequency("MONTHLY");
      setInterval(1);
      setStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: activeTz }).format(new Date()));
      setEndDate(null);
    }
    setErrorMsg("");
  }, [sourceToEdit, isOpen, bankAccounts, setEndDate, setFrequency, setInterval, setIsRecurring, setStartDate, activeTz, toTenantDateString]);

  const confirmArchive = async () => {
    if (!sourceToEdit) return;
    setArchiving(true);
    try {
      await archiveIncomeMut.mutateAsync({ id: sourceToEdit.id });
      await Promise.all([utils.listIncomeSources.invalidate(), utils.listIncomeEvents.invalidate()]);
      toast.success(t("toasts.archived"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modals.incomeExpenseForm.failedToArchive"));
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const isScheduleRuleChanged = useMemo(() => {
    if (!isEdit || !sourceToEdit) return false;
    const initialParsed = parseRecurrenceRule(sourceToEdit.rrule);
    const initialStartDate = sourceToEdit.startDate ? toTenantDateString(sourceToEdit.startDate) : "";
    const currentStart = startDate || "";
    return (
      frequency !== initialParsed.frequency ||
      interval !== initialParsed.interval ||
      currentStart !== initialStartDate
    );
  }, [isEdit, sourceToEdit, frequency, interval, startDate, toTenantDateString]);

  const executeSave = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const formattedAmount = cleanAmount(amount);
      const payload = {
        name,
        amount: formattedAmount,
        receivingAccountId: receivingAccountId || undefined,
        isRecurring,
        frequency: isRecurring ? frequency : undefined,
        interval: isRecurring ? (interval || 1) : undefined,
        startDate: startDate || undefined,
        endDate: isRecurring && endDate ? endDate : undefined,
        contributionMode: hasPrivateEnvelopes ? contributionMode : "FULL",
        contributionValue: hasPrivateEnvelopes && contributionMode !== "FULL" ? cleanAmount(contributionValue) : null,
      };
      if (isEdit && sourceToEdit) {
        await updateIncomeMut.mutateAsync({ id: sourceToEdit.id, data: payload });
      } else {
        await createIncomeMut.mutateAsync(payload);
      }
      await Promise.all([utils.listIncomeSources.invalidate(), utils.listIncomeEvents.invalidate()]);
      toast.success(t("toasts.saved"));
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || t("categories.saveFailed"));
    } finally {
      setSubmitting(false);
      setShowRuleChangeConfirm(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg(t("categories.nameRequired"));
    if (!amount || parseFloat(amount) <= 0) return setErrorMsg(t("categories.goalAmountRequired"));
    if (isRecurring && endDate && startDate && endDate < startDate) return setErrorMsg(t("categories.goalPastDateWarning"));

    if (hasPrivateEnvelopes && contributionMode === "PERCENTAGE") {
      const pct = parseFloat(contributionValue);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        return setErrorMsg(t("planTabs.householdContribution.percentageInvalid"));
      }
    }
    if (hasPrivateEnvelopes && contributionMode === "FIXED_AMOUNT") {
      const fix = parseFloat(cleanAmount(contributionValue));
      const expAmt = parseFloat(cleanAmount(amount));
      if (isNaN(fix) || fix <= 0) {
        return setErrorMsg(t("planTabs.householdContribution.amountInvalid"));
      }
      if (fix > expAmt) {
        return setErrorMsg(t("planTabs.householdContribution.fixedCannotExceedExpected"));
      }
    }

    if (isEdit && isScheduleRuleChanged) {
      setShowRuleChangeConfirm(true);
      return;
    }
    await executeSave();
  };

  const isDirty = useMemo(() => {
    if (isEdit && sourceToEdit) {
      const initialParsed = parseRecurrenceRule(sourceToEdit.rrule);
      const initialStartDate = sourceToEdit.startDate ? toTenantDateString(sourceToEdit.startDate) : "";
      const initialEndDate = sourceToEdit.endDate ? toTenantDateString(sourceToEdit.endDate) : "";
      const currentStart = startDate || "";
      const currentEnd = endDate || "";
      const initialContributionValue = sourceToEdit.contributionValue ? String(sourceToEdit.contributionValue) : "";

      return (
        name.trim() !== (sourceToEdit.name || "").trim() ||
        cleanAmount(amount) !== cleanAmount(sourceToEdit.amount || "") ||
        receivingAccountId !== (sourceToEdit.receivingAccountId || "") ||
        (hasPrivateEnvelopes && (
          contributionMode !== (sourceToEdit.contributionMode || "FULL") ||
          contributionValue !== initialContributionValue
        )) ||
        isRecurring !== (initialParsed.isRecurring || !!sourceToEdit.startDate) ||
        frequency !== initialParsed.frequency ||
        interval !== initialParsed.interval ||
        currentStart !== initialStartDate ||
        currentEnd !== initialEndDate
      );
    }
    return Boolean(name.trim() || amount.trim() || (hasPrivateEnvelopes && contributionValue.trim()));
  }, [
    isEdit,
    sourceToEdit,
    name,
    amount,
    receivingAccountId,
    hasPrivateEnvelopes,
    contributionMode,
    contributionValue,
    isRecurring,
    frequency,
    interval,
    startDate,
    endDate,
    toTenantDateString,
  ]);
  const isValid = Boolean(name.trim() && amount && parseFloat(amount) > 0);

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? (sourceToEdit?.name || "") : t("planTabs.addIncomeSchedule")}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
        <FormErrorBanner message={errorMsg} />

        <Input
          label={t("settings.income.scheduleName")}
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("modals.incomeExpenseForm.placeholderIncomeName")}
        />

        <AmountField
          label={t("modals.incomeExpenseForm.expectedAmount", { symbol: currencySymbol })}
          required
          value={amount}
          onChange={setAmount}
          currency={currency}
          currencySymbol={currencySymbol}
          minorUnits={minorUnits}
        />

        <GenericSelectField
          label={t("modals.incomeExpenseForm.receivingBankAccount")}
          value={receivingAccountId}
          onChange={setReceivingAccountId}
          placeholder={t("modals.incomeExpenseForm.defaultMainAccount")}
          options={bankAccounts.map((acct) => ({ value: acct.id, label: acct.name }))}
        />

        <RecurrenceBuilder builder={recurrenceBuilder} />

        {!hasPrivateEnvelopes ? (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200 dark:border-slate-700/60">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {t("planTabs.householdContribution.allSharedNote")}
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200 dark:border-slate-700/60">
            <FormLabel>{t("planTabs.householdContribution.title")}</FormLabel>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[11px]">
              <button
                type="button"
                onClick={() => setContributionMode("FULL")}
                className={`py-1.5 px-2 rounded font-medium transition-colors ${contributionMode === "FULL" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
              >
                {t("planTabs.householdContribution.full")}
              </button>
              <button
                type="button"
                onClick={() => setContributionMode("PERCENTAGE")}
                className={`py-1.5 px-2 rounded font-medium transition-colors ${contributionMode === "PERCENTAGE" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
              >
                {t("planTabs.householdContribution.percentage")}
              </button>
              <button
                type="button"
                onClick={() => setContributionMode("FIXED_AMOUNT")}
                className={`py-1.5 px-2 rounded font-medium transition-colors ${contributionMode === "FIXED_AMOUNT" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
              >
                {t("planTabs.householdContribution.fixedAmount")}
              </button>
            </div>

            {contributionMode === "PERCENTAGE" && (
              <div className="pt-2">
                <Input
                  label={t("planTabs.householdContribution.modeLabel")}
                  type="number"
                  min={1}
                  max={100}
                  value={contributionValue}
                  onChange={(e) => setContributionValue(e.target.value)}
                  placeholder={t("planTabs.householdContribution.percentagePlaceholder")}
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  {t("planTabs.householdContribution.remainderNote")}
                </p>
              </div>
            )}

            {contributionMode === "FIXED_AMOUNT" && (
              <div className="pt-2">
                <AmountField
                  label={t("planTabs.householdContribution.modeLabel")}
                  value={contributionValue}
                  onChange={setContributionValue}
                  currency={currency}
                  currencySymbol={currencySymbol}
                  minorUnits={minorUnits}
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  {t("planTabs.householdContribution.remainderNote")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-200">
          {isEdit ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={archiving || submitting}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {t("modals.incomeExpenseForm.archiveSchedule")}
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting || archiving} disabled={!isDirty || !isValid || submitting || archiving}>
              {isEdit ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={t("modals.incomeExpenseForm.archiveIncomeTitle")}
        description={t("modals.incomeExpenseForm.archiveIncomeConfirm")}
        confirmLabel={t("modals.incomeExpenseForm.archiveSchedule")}
        variant="danger"
        isLoading={archiving}
      />

      <ConfirmDialog
        isOpen={showRuleChangeConfirm}
        onClose={() => setShowRuleChangeConfirm(false)}
        onConfirm={executeSave}
        title={t("modals.updateSchedule.confirmTitleIncome")}
        description={t("modals.updateSchedule.confirmDescRuleChange", { startDate: startDate || "" })}
        confirmLabel={t("modals.updateSchedule.confirmCta")}
        variant="warning"
        isLoading={submitting}
      />
    </ModalDialog>
  );
}
export default IncomeFormModal;
