"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, RecurrenceBuilder, useRecurrenceBuilder, ConfirmDialog, Button, AmountField, ModalDialog, Input, GenericSelectField, FormErrorBanner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";
import { useLocale } from "../../providers/LocaleProvider";

const toAestDateString = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(iso));

export interface IncomeSourceToEdit {
  id: string;
  name: string;
  amount: string;
  receivingAccountId?: string;
  rrule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  interval?: number | null;
}

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceToEdit?: IncomeSourceToEdit;
}

function cleanAmount(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

function parseSourceRecurrence(source?: IncomeSourceToEdit | null) {
  if (!source) {
    return { origIsRecurring: true, origFrequency: "MONTHLY" as const, origInterval: 1 };
  }
  const origIsRecurring = !!source.rrule || !!source.startDate;
  if (source.rrule) {
    const match = source.rrule.match(/INTERVAL=(\d+)/);
    const parsedInterval = match ? parseInt(match[1], 10) : 1;
    if (source.rrule.includes("FREQ=WEEKLY")) {
      if (source.rrule.includes("FREQ=WEEKLY;INTERVAL=2") || (parsedInterval > 1 && parsedInterval % 2 === 0)) {
        return { origIsRecurring, origFrequency: "FORTNIGHTLY" as const, origInterval: Math.max(1, Math.floor(parsedInterval / 2)) };
      }
      return { origIsRecurring, origFrequency: "WEEKLY" as const, origInterval: parsedInterval };
    } else if (source.rrule.includes("FREQ=YEARLY") || source.rrule.includes("FREQ=ANNUALLY")) {
      return { origIsRecurring, origFrequency: "ANNUALLY" as const, origInterval: parsedInterval };
    }
  }
  return { origIsRecurring, origFrequency: "MONTHLY" as const, origInterval: 1 };
}

export function IncomeFormModal({ isOpen, onClose, sourceToEdit }: IncomeFormModalProps) {
  const { currency, currencySymbol, minorUnits } = useLocale();
  const toast = useToast();
  const utils = trpc.useUtils();

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

  const isEdit = !!sourceToEdit;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");

  const recurrenceBuilder = useRecurrenceBuilder();
  const { frequency, isRecurring, interval, startDate, endDate, setStartDate, setEndDate, setIsRecurring, setFrequency, setInterval } = recurrenceBuilder;

  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || "");
      setAmount(sourceToEdit.amount || "");
      setReceivingAccountId(sourceToEdit.receivingAccountId || "");
      const { origIsRecurring, origFrequency, origInterval } = parseSourceRecurrence(sourceToEdit);
      setIsRecurring(origIsRecurring);
      setFrequency(origFrequency);
      setInterval(origInterval);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
      setStartDate(sourceToEdit.startDate ? toAestDateString(sourceToEdit.startDate) : today);
      setEndDate(sourceToEdit.endDate ? toAestDateString(sourceToEdit.endDate) : null);
    } else {
      setName("");
      setAmount("");
      setReceivingAccountId(bankAccounts[0]?.id || "");
      setIsRecurring(true);
      setFrequency("MONTHLY");
      setInterval(1);
      setStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
      setEndDate(null);
    }
    setErrorMsg("");
  }, [sourceToEdit, isOpen, bankAccounts, setEndDate, setFrequency, setInterval, setIsRecurring, setStartDate]);

  const confirmArchive = async () => {
    if (!sourceToEdit) return;
    setArchiving(true);
    try {
      await archiveIncomeMut.mutateAsync({ id: sourceToEdit.id });
      await utils.listIncomeSources.invalidate();
      await utils.listIncomeEvents.invalidate();
      toast.success(t("toasts.archived"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modals.incomeExpenseForm.failedToArchive"));
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg("Name is required.");
    if (!amount || parseFloat(amount) <= 0) return setErrorMsg("Please enter a valid positive amount.");
    if (isRecurring && endDate && startDate && endDate < startDate) return setErrorMsg("End date cannot be prior to start date.");

    setSubmitting(true);
    setErrorMsg("");
    try {
      const formattedAmount = cleanAmount(amount);
      if (isEdit && sourceToEdit) {
        await updateIncomeMut.mutateAsync({
          id: sourceToEdit.id,
          data: {
            name,
            amount: formattedAmount,
            receivingAccountId: receivingAccountId || undefined,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            interval: isRecurring ? (interval || 1) : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          },
        });
      } else {
        await createIncomeMut.mutateAsync({
          name,
          amount: formattedAmount,
          receivingAccountId: receivingAccountId || undefined,
          isRecurring,
          frequency: isRecurring ? frequency : undefined,
          interval: isRecurring ? (interval || 1) : undefined,
          startDate: startDate || undefined,
          endDate: isRecurring && endDate ? endDate : undefined,
        });
      }
      await utils.listIncomeSources.invalidate();
      await utils.listIncomeEvents.invalidate();
      toast.success(isEdit ? "Income schedule updated successfully." : t("toasts.saved"));
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save income schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const isDirty = Boolean(name.trim() || amount.trim());
  const isValid = Boolean(name.trim() && amount && parseFloat(amount) > 0);

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t("modals.incomeExpenseForm.titleEditIncome") : t("modals.incomeExpenseForm.titleAddIncome")}
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
    </ModalDialog>
  );
}
export default IncomeFormModal;
