"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer, Spinner } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";

interface QuickExpenseDrawerProps {
  onClose: () => void;
}

export function QuickExpenseDrawer({ onClose }: QuickExpenseDrawerProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [type, setType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isIncome = type === "CREDIT";
  const isFutureDate = date > todayStr;

  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createUpcomingExpenseMut = trpc.createUpcomingExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const createUpcomingIncomeMut = trpc.createUpcomingIncome.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  function handleDone() {
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (!name.trim()) {
      setError(isIncome ? "Income source name is required." : "Expense bill name is required.");
      return;
    }
    if (!amount || isNaN(amountNum) || amountNum < 0) {
      setError("Amount cannot be negative.");
      return;
    }

    if (!isIncome) {
      if (!categoryId) {
        setError(t("transactions.newExpense.categoryLabel") + " is required.");
        return;
      }
      if (isFutureDate) {
        createUpcomingExpenseMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          categoryId,
          expectedDate: date,
          note,
        });
      } else {
        recordExpenseMutation.mutate({
          categoryId,
          amount: amountNum.toFixed(2),
          flowType: "DEBIT",
          note: note || `Expense: ${name}`,
          recordedAt: new Date(date).toISOString(),
        });
      }
    } else {
      if (isFutureDate) {
        createUpcomingIncomeMut.mutate({
          name,
          amount: amountNum.toFixed(2),
          expectedDate: date,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
      } else {
        recordExpenseMutation.mutate({
          categoryId: categories[0]?.id || "",
          amount: amountNum.toFixed(2),
          flowType: "CREDIT",
          note: note || `Income: ${name}`,
          recordedAt: new Date(date).toISOString(),
        });
      }
    }
  }

  const isPending =
    recordExpenseMutation.isPending ||
    createUpcomingExpenseMut.isPending ||
    createUpcomingIncomeMut.isPending;

  return (
    <SlideOverDrawer
      title={isIncome ? "Quick Record Income" : "Quick Record Expense"}
      onClose={onClose}
      widthClass="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-emerald-600">
            <span className="text-4xl">✅</span>
            <p className="text-base font-bold">
              {isIncome ? "Income recorded successfully!" : "Expense recorded successfully!"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  !isIncome ? "bg-white text-rose-700 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <span>💸</span>
                <span>Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isIncome ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <span>💰</span>
                <span>Income</span>
              </button>
            </div>

            {error && (
              <div className="text-xs font-bold p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                {isIncome ? "Income Source Name" : "Expense Bill Name"}
              </label>
              <input
                type="text"
                placeholder={isIncome ? "e.g. Salary, Client Pay" : "e.g. Electric Bill, Rent"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>

            {!isIncome ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Receiving Bank Account
                </label>
                <select
                  value={receivingAccountId}
                  onChange={(e) => setReceivingAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
                >
                  <option value="">Default Account</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Notes / Description (optional)
              </label>
              <input
                type="text"
                placeholder="Add notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#00B4A6] hover:bg-[#009b8f]"
              }`}
            >
              {isPending && <Spinner size="sm" />}
              {isFutureDate
                ? isIncome
                  ? "📅 Schedule Future Income"
                  : "📅 Schedule Future Expense"
                : isIncome
                ? "Record Income"
                : "Record Expense"}
            </button>
          </>
        )}
      </form>
    </SlideOverDrawer>
  );
}
