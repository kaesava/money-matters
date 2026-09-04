"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast, RecurrenceBuilder, useRecurrenceBuilder, ConfirmDialog, Button } from "@money-matters/ui/web";
import { ModalDialog } from "./ModalDialog";

import { t } from "@money-matters/i18n";
import { trpc } from "../../lib/trpc";

interface SourceToEdit {
  id: string;
  name: string;
  amount: string;
  poolId?: string;
  categoryId?: string;
  receivingAccountId?: string;
  rrule?: string | null;
  startDate?: string | null;
}

interface IncomeExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "INCOME" | "EXPENSE";
  sourceToEdit?: SourceToEdit;
}

function cleanAmount(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

export default function IncomeExpenseFormModal({
  isOpen,
  onClose,
  mode,
  sourceToEdit,
}: IncomeExpenseFormModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);

  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery(undefined, { enabled: isOpen });
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);

  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation();

  const createExpenseMut = trpc.createExpenseSource.useMutation();
  const updateExpenseMut = trpc.updateExpenseSource.useMutation();
  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation();


  const isEdit = !!sourceToEdit;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [poolId, setPoolId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  
  const recurrenceBuilder = useRecurrenceBuilder();
  const { frequency, isRecurring, startDate, endDate, setStartDate, setEndDate, setIsRecurring, setFrequency, setInterval } = recurrenceBuilder;
  
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || "");
      setAmount(sourceToEdit.amount || "");
      setPoolId(sourceToEdit.poolId || pools[0]?.id || "");
      setReceivingAccountId(sourceToEdit.receivingAccountId || "");

      const hasSchedule = !!sourceToEdit.rrule || !!sourceToEdit.startDate;
      setIsRecurring(hasSchedule);

      if (sourceToEdit.rrule) {
        if (sourceToEdit.rrule.includes("FREQ=WEEKLY;INTERVAL=2")) {
          setFrequency("FORTNIGHTLY");
          setInterval(1);
        } else if (sourceToEdit.rrule.includes("FREQ=WEEKLY")) {
          setFrequency("WEEKLY");
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else if (sourceToEdit.rrule.includes("FREQ=YEARLY")) {
          setFrequency("ANNUALLY");
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else {
          setFrequency("MONTHLY");
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        }
      } else {
        setFrequency("MONTHLY");
        setInterval(1);
      }

      setStartDate(sourceToEdit.startDate ? sourceToEdit.startDate.split("T")[0] : new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
      // Note: sourceToEdit currently doesn't provide endDate in the interface, so we omit setting it, or we could add it to SourceToEdit if needed.
    } else {
      setName("");
      setAmount("");
      setPoolId(pools.find((p) => p.poolType === "REGULAR")?.id || pools[0]?.id || "");
      setReceivingAccountId(bankAccounts[0]?.id || "");
      setIsRecurring(true);
      setFrequency("MONTHLY");
      setInterval(1);
      setStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
      setEndDate(null);
    }
    setErrorMsg("");
  }, [sourceToEdit, isOpen, bankAccounts, pools, setEndDate, setFrequency, setInterval, setIsRecurring, setStartDate]);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const confirmArchive = async () => {
    if (!sourceToEdit) return;
    setArchiving(true);
    try {
      if (mode === "INCOME") {
        await archiveIncomeMut.mutateAsync({ id: sourceToEdit.id });
        await utils.listIncomeSources.invalidate();
        await utils.listIncomeEvents.invalidate();
      } else {
        await archiveExpenseMut.mutateAsync({ id: sourceToEdit.id });
        await utils.listExpenseSources.invalidate();
        await utils.listExpenseEvents.invalidate();
      }
      toast.success(t("toasts.archived", { defaultValue: "Archived successfully." }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive.");
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleArchive = () => {
    setShowArchiveConfirm(true);
  };


  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    if (mode === "EXPENSE" && !poolId) {
      setErrorMsg("Expense sources MUST be assigned to a Pool.");
      return;
    }

    const formattedAmount = cleanAmount(amount);

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (mode === "INCOME") {
        if (isEdit && sourceToEdit) {
          await updateIncomeMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name,
              amount: formattedAmount,
              receivingAccountId: receivingAccountId || undefined,
              isRecurring,
              frequency: isRecurring ? frequency : undefined,
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
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          });
        }
        await utils.listIncomeSources.invalidate();
        await utils.listIncomeEvents.invalidate();
      } else {
        if (isEdit && sourceToEdit) {
          await updateExpenseMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name,
              amount: formattedAmount,
              poolId,
              isRecurring,
              frequency: isRecurring ? frequency : undefined,
              startDate: startDate || undefined,
              endDate: isRecurring && endDate ? endDate : undefined,
            },
          });
        } else {
          await createExpenseMut.mutateAsync({
            name,
            amount: formattedAmount,
            poolId,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          });
        }
        await utils.listExpenseSources.invalidate();
        await utils.listExpenseEvents.invalidate();
      }


      toast.success(
        isRecurring
          ? t("toasts.saved")
          : mode === "INCOME"
          ? "One-off income saved to Upcoming Timeline."
          : "One-off bill saved to Upcoming Timeline."
      );
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save stream");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${mode === "INCOME" ? "Income Schedule" : "Bill Schedule"}` : `Add ${mode === "INCOME" ? "Income Schedule" : "Bill Schedule"}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-2 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">
            {mode === "INCOME" ? "Income Name" : "Bill Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "INCOME" ? "e.g. Salary, Client Retainer" : "e.g. Rent, Netflix, Energy"}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Expected Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        {mode === "INCOME" && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">
              {t("modals.incomeExpenseForm.receivingBankAccount", { defaultValue: "Receiving Bank Account" })}
            </label>
            <select
              value={receivingAccountId}
              onChange={(e) => setReceivingAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">
                {t("modals.incomeExpenseForm.defaultMainAccount", { defaultValue: "Default Main Account" })}
              </option>
              {bankAccounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "EXPENSE" && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">
              {t("modals.incomeExpenseForm.assignedPool", { defaultValue: "Assigned Pool" })}
            </label>
            <select
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">
                {t("modals.incomeExpenseForm.selectTargetPool", { defaultValue: "Select Target Pool..." })}
              </option>
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.poolType})
                </option>
              ))}
            </select>
          </div>
        )}

        <RecurrenceBuilder builder={recurrenceBuilder} />

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-zinc-200">
          {isEdit ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving || submitting}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1.5 transition-colors disabled:opacity-50"
            >
              {archiving ? "Archiving..." : "Archive Schedule"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <Button
              type="button"
              onClick={handleSave}
              loading={submitting || archiving}
              disabled={!name.trim() || !amount.trim() || parseFloat(amount) <= 0 || (mode === "EXPENSE" && !poolId)}
            >
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={confirmArchive}
        title={`Archive ${mode === "INCOME" ? "Income Schedule" : "Bill Schedule"}`}
        description={`Archiving this ${mode === "INCOME" ? "income schedule" : "bill schedule"} will cancel all future upcoming events. Continue?`}
        confirmLabel="Archive Schedule"
        variant="danger"
        isLoading={archiving}
      />
    </ModalDialog>
  );
}

