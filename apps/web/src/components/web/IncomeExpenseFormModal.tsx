"use client";
import React, { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";

export interface IncomeExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "INCOME" | "EXPENSE";
  sourceToEdit?: {
    id: string;
    name: string;
    amount: string;
    categoryId?: string | null;
    receivingAccountId?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function IncomeExpenseFormModal({
  isOpen,
  onClose,
  mode,
  sourceToEdit,
  onSuccess,
}: IncomeExpenseFormModalProps) {
  const utils = trpc.useUtils();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const createIncomeMut = trpc.createIncomeSource.useMutation();
  const updateIncomeMut = trpc.updateIncomeSource.useMutation();

  const createExpenseMut = trpc.createExpenseSource.useMutation();
  const updateExpenseMut = trpc.updateExpenseSource.useMutation();

  const isEdit = !!sourceToEdit;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name || "");
      setAmount(sourceToEdit.amount || "");
      setCategoryId(sourceToEdit.categoryId || "");
      setReceivingAccountId(sourceToEdit.receivingAccountId || "");
    } else {
      setName("");
      setAmount("");
      setCategoryId(categories.find((c) => c.type !== "EVERYDAY")?.id || "");
      setReceivingAccountId(bankAccounts[0]?.id || "");
      setIsRecurring(true);
      setFrequency("MONTHLY");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
    setErrorMsg("");
  }, [sourceToEdit, isOpen]);

  const isDirty = isEdit
    ? name !== (sourceToEdit?.name || "") ||
      amount !== (sourceToEdit?.amount || "") ||
      categoryId !== (sourceToEdit?.categoryId || "") ||
      receivingAccountId !== (sourceToEdit?.receivingAccountId || "")
    : name.trim().length > 0 || amount.length > 0;

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    if (mode === "EXPENSE" && !categoryId) {
      setErrorMsg("Expense sources MUST be assigned to a Category.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (mode === "INCOME") {
        if (isEdit && sourceToEdit) {
          await updateIncomeMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name,
              amount,
              receivingAccountId: receivingAccountId || undefined,
            },
          });
        } else {
          await createIncomeMut.mutateAsync({
            name,
            amount,
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
          await updateExpenseMut.mutateAsync({
            id: sourceToEdit.id,
            data: {
              name,
              amount,
              categoryId: categoryId || undefined,
            },
          });
        } else {
          await createExpenseMut.mutateAsync({
            name,
            amount,
            categoryId,
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
          });
        }
        await utils.listExpenseSources.invalidate();
        await utils.listExpenseEvents.invalidate();
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to save ${mode.toLowerCase()} source.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `Edit ${mode === "INCOME" ? "Income Source" : "Expense Bill"}: ${sourceToEdit.name}`
          : `Add New ${mode === "INCOME" ? "Income Source" : "Expense Bill"}`
      }
      subtitle={
        mode === "INCOME"
          ? "Configure paycheck, bonus, or investment deposit"
          : "Configure recurring utility, rent, or bill obligation"
      }
      isDirty={isDirty}
      onSave={handleSave}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4"
      >
        {errorMsg && (
          <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Source Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {mode === "INCOME" ? "Income Source Name" : "Expense Bill Name"}
          </label>
          <input
            type="text"
            placeholder={mode === "INCOME" ? "e.g. Primary Salary, Yearly Bonus" : "e.g. Electricity, Internet"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
          />
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Expected Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
          />
        </div>

        {/* Expense Category (Mandatory for Expense) */}
        {mode === "EXPENSE" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Assigned Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Income Receiving Bank Account */}
        {mode === "INCOME" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Receiving Bank Account (Optional)
            </label>
            <select
              value={receivingAccountId}
              onChange={(e) => setReceivingAccountId(e.target.value)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
            >
              <option value="">-- Direct Deposit Account --</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recurrence Settings (For New items or schedule updates) */}
        <div className="flex flex-col gap-3 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#1B2B4B]">
                Recurrence Schedule
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  Recurring
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    !isRecurring ? "bg-[#1B2B4B] text-white shadow-sm" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  One-off
                </button>
              </div>
            </div>

            {isRecurring ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="FORTNIGHTLY">Fortnightly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUALLY">Annually (Yearly)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    First Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Event Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-zinc-900"
                />
              </div>
            )}
          </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : `Create ${mode === "INCOME" ? "Income" : "Expense"}`}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
