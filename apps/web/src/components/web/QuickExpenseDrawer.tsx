import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { SlideOverDrawer, Spinner, SearchableCategorySelect, InfoTooltip, useIconVisibility } from "@money-matters/ui/web";
import { trpc } from "../../lib/trpc";
import posthog from "../../lib/posthog-client";

export interface QuickActionDrawerProps {
  onClose: () => void;
  initialTab?: "DEBIT" | "CREDIT" | "TRANSFER";
}

export function QuickActionDrawer({ onClose, initialTab = "DEBIT" }: QuickActionDrawerProps) {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

  const [type, setType] = useState<"DEBIT" | "CREDIT" | "TRANSFER">(initialTab);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [destinationCategoryId, setDestinationCategoryId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [date, setDate] = useState(todayStr);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { showIcons } = useIconVisibility();
  const utils = trpc.useUtils();

  const isIncome = type === "CREDIT";
  const isTransfer = type === "TRANSFER";
  const isFutureDate = date > todayStr;

  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();

  const recordExpenseMutation = trpc.recordExpense.useMutation({
    onSuccess: () => handleDone(),
    onError: (err) => setError(err.message),
  });

  const moveMoneyMutation = trpc.moveMoney.useMutation({
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
    utils.listTransactions.invalidate();
    utils.listCategories.invalidate();
    utils.listIncomeSources.invalidate();
    utils.listExpenseSources.invalidate();
    utils.listIncomeEvents.invalidate();
    utils.listExpenseEvents.invalidate();
    utils.listBankAccountsWithExpected.invalidate();
    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!name.trim()) {
      setError(isTransfer ? "Transfer name is required." : isIncome ? "Income source name is required." : "Expense name is required.");
      return;
    }

    if (isTransfer) {
      if (!sourceCategoryId || !destinationCategoryId) {
        setError("Please select both source and destination categories.");
        return;
      }
      if (sourceCategoryId === destinationCategoryId) {
        setError("Source and destination categories must be different.");
        return;
      }
      const sourceCat = categories.find((c) => c.id === sourceCategoryId);
      if (sourceCat) {
        const sourceBal = parseFloat(sourceCat.currentBalance || "0");
        if (amountNum > sourceBal) {
          if (!confirm(`Warning: Transferring $${amountNum.toFixed(2)} exceeds "${sourceCat.name}" balance ($${sourceBal.toFixed(2)}). Proceed?`)) {
            return;
          }
        }
      }
      moveMoneyMutation.mutate({
        sourceCategoryId,
        destinationCategoryId,
        amount: amountNum.toFixed(2),
        note: name,
      });
      posthog.capture("money_moved_between_categories", {
        amount: amountNum,
        source_category_id: sourceCategoryId,
        destination_category_id: destinationCategoryId,
      });
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
          note: name,
        });
      } else {
        recordExpenseMutation.mutate({
          categoryId,
          amount: amountNum.toFixed(2),
          flowType: "DEBIT",
          note: name,
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
          note: name,
        });
      } else {
        const targetCat = categories.find((c) => c.type === "EVERYDAY") || categories[0];
        if (!targetCat?.id) {
          setError("No active pool category found. Please ensure at least one category exists.");
          return;
        }
        recordExpenseMutation.mutate({
          categoryId: targetCat.id,
          amount: amountNum.toFixed(2),
          flowType: "CREDIT",
          note: name,
          recordedAt: new Date(date).toISOString(),
        });
      }
    }
  }

  const isPending =
    recordExpenseMutation.isPending ||
    moveMoneyMutation.isPending ||
    createUpcomingExpenseMut.isPending ||
    createUpcomingIncomeMut.isPending;

  return (
    <SlideOverDrawer
      title={isTransfer ? "Transfer Between Categories" : isIncome ? "Quick Record Income" : "Quick Record Expense"}
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-emerald-600">
            {showIcons && <span className="text-4xl">✅</span>}
            <p className="text-base font-bold">
              {isTransfer
                ? "Transfer completed successfully!"
                : isIncome
                ? "Income recorded successfully!"
                : "Expense recorded successfully!"}
            </p>
          </div>
        ) : (
          <>
            {/* 3-Way Segmented Control */}
            <div className="flex rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "DEBIT" ? "bg-white text-rose-700 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>💸</span>}
                <span>Expense</span>
                <InfoTooltip
                  title="Quick Record Expense"
                  content="Log an out-of-pocket spend. Money Matters deducts this from your Everyday pool balance so your bill buffer and savings goals stay 100% protected."
                />
              </button>
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "CREDIT" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>💰</span>}
                <span>Income</span>
                <InfoTooltip
                  title="Quick Record Income"
                  content="Log unexpected income, cash deposits, or side hustle earnings. Funds are added to your Everyday pool until your next scheduled payday cascade."
                />
              </button>
              <button
                type="button"
                onClick={() => setType("TRANSFER")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === "TRANSFER" ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {showIcons && <span>🔄</span>}
                <span>Transfer</span>
                <InfoTooltip
                  title="Transfer Between Pools"
                  content="Reallocate money directly between virtual pools (e.g., moving surplus from Everyday to a Goal pool, or adjusting bill reserves)."
                />
              </button>
            </div>

            {error && (
              <div className="text-xs font-bold p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {error}
              </div>
            )}

            {isTransfer ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    Transfer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Savings allocation, Rent transfer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    From Source Category
                  </label>
                  <SearchableCategorySelect
                    value={sourceCategoryId}
                    onChange={setSourceCategoryId}
                    categories={categories}
                    placeholder="Select Source Category..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    To Destination Category
                  </label>
                  <SearchableCategorySelect
                    value={destinationCategoryId}
                    onChange={setDestinationCategoryId}
                    categories={categories.filter((c) => c.id !== sourceCategoryId)}
                    placeholder="Select Destination Category..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    Transfer Amount ($)
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
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    {isIncome ? "Income Source Name" : "Expense Name"}
                  </label>
                  <input
                    type="text"
                    placeholder={isIncome ? "e.g. Salary, Client Pay" : "e.g. Groceries, Coffee, Electric Bill"}
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
                    <SearchableCategorySelect
                      value={categoryId}
                      onChange={setCategoryId}
                      categories={categories}
                      placeholder="Select Category..."
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                      Receiving Bank Account
                    </label>
                    <select
                      value={receivingAccountId}
                      onChange={(e) => setReceivingAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white text-zinc-900 shadow-xs"
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
              </>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isTransfer
                  ? "bg-blue-600 hover:bg-blue-700"
                  : isIncome
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#00B4A6] hover:bg-[#009b8f]"
              }`}
            >
              {isPending && <Spinner size="sm" />}
              {isTransfer
                ? "Transfer budget"
                : isFutureDate
                ? isIncome
                  ? `${showIcons ? "📅 " : ""}Schedule Future Income`
                  : `${showIcons ? "📅 " : ""}Schedule Future Expense`
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

// Alias re-export for backwards compatibility
export const QuickExpenseDrawer = QuickActionDrawer;


