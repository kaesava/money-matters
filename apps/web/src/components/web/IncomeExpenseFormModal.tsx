"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "@money-matters/ui/web";
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

  const createExpenseMut = trpc.createExpenseSource.useMutation();

  const isEdit = !!sourceToEdit;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [poolId, setPoolId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [startDate, setStartDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
  const [submitting, setSubmitting] = useState(false);
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
        if (sourceToEdit.rrule.includes("FREQ=WEEKLY;INTERVAL=2")) setFrequency("FORTNIGHTLY");
        else if (sourceToEdit.rrule.includes("FREQ=WEEKLY")) setFrequency("WEEKLY");
        else if (sourceToEdit.rrule.includes("FREQ=YEARLY")) setFrequency("ANNUALLY");
        else setFrequency("MONTHLY");
      } else {
        setFrequency("MONTHLY");
      }

      setStartDate(sourceToEdit.startDate ? sourceToEdit.startDate.split("T")[0] : new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
    } else {
      setName("");
      setAmount("");
      setPoolId(pools.find((p) => p.poolType === "REGULAR")?.id || pools[0]?.id || "");
      setReceivingAccountId(bankAccounts[0]?.id || "");
      setIsRecurring(true);
      setFrequency("MONTHLY");
      setStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()));
    }
    setErrorMsg("");
  }, [sourceToEdit, isOpen, bankAccounts, pools]);

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
          });
        }
        await utils.listIncomeSources.invalidate();
        await utils.listIncomeEvents.invalidate();
      } else {
        if (isEdit && sourceToEdit) {
          await createExpenseMut.mutateAsync({
            name,
            amount: formattedAmount,
            poolId,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
          });
        } else {
          await createExpenseMut.mutateAsync({
            name,
            amount: formattedAmount,
            poolId,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
          });
        }
        await utils.listExpenseSources.invalidate();
        await utils.listExpenseEvents.invalidate();
      }

      toast.success(t("toasts.saved"));
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
      <div className="space-y-4 text-xs font-medium text-zinc-700">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Name / Label</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "INCOME" ? "e.g. Salary, Client Retainer" : "e.g. Electricity, Gym Membership"}
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#1B2B4B] mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        {mode === "EXPENSE" && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.incomeExpenseForm.assignPool", { defaultValue: "Assign to Pool" })}</label>
            <select
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.poolType})
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "INCOME" && bankAccounts.length > 0 && (
          <div>
            <label className="block font-bold text-[#1B2B4B] mb-1">Receiving Bank Account (Optional)</label>
            <select
              value={receivingAccountId}
              onChange={(e) => setReceivingAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">(None / Unlinked)</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
          />
          <span className="font-bold text-zinc-800">{t("modals.incomeExpenseForm.recurringSchedule", { defaultValue: "Recurring Schedule" })}</span>
        </label>

        {isRecurring && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.incomeExpenseForm.frequency", { defaultValue: "Frequency" })}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY")}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="WEEKLY">{t("frequencies.weekly", { defaultValue: "Weekly" })}</option>
                <option value="FORTNIGHTLY">{t("frequencies.fortnightly", { defaultValue: "Fortnightly" })}</option>
                <option value="MONTHLY">{t("frequencies.monthly", { defaultValue: "Monthly" })}</option>
                <option value="ANNUALLY">{t("frequencies.annually", { defaultValue: "Annually" })}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1B2B4B] mb-1">{t("modals.incomeExpenseForm.firstDate", { defaultValue: "First Date" })}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
          >
            {submitting ? "Saving..." : isEdit ? "Update Stream" : "Create Stream"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
