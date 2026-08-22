import React, { useEffect, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  type?: string;
  currentBalance: string;
}

interface BankAccount {
  id: string;
  name: string;
}

interface QuickExpenseCardProps {
  categories: Category[];
  bankAccounts?: BankAccount[];
  quickType: "DEBIT" | "CREDIT";
  setQuickType: (type: "DEBIT" | "CREDIT") => void;
  quickName: string;
  setQuickName: (name: string) => void;
  quickCategoryId: string;
  setQuickCategoryId: (id: string) => void;
  quickReceivingAccountId: string;
  setQuickReceivingAccountId: (id: string) => void;
  quickAmount: string;
  setQuickAmount: (amt: string) => void;
  quickDate: string;
  setQuickDate: (date: string) => void;
  quickNote: string;
  setQuickNote: (note: string) => void;
  quickMsg: string | null;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function QuickExpenseCard({
  categories,
  bankAccounts = [],
  quickType,
  setQuickType,
  quickName,
  setQuickName,
  quickCategoryId,
  setQuickCategoryId,
  quickReceivingAccountId,
  setQuickReceivingAccountId,
  quickAmount,
  setQuickAmount,
  quickDate,
  setQuickDate,
  quickNote,
  setQuickNote,
  quickMsg,
  isPending,
  onSubmit,
}: QuickExpenseCardProps) {
  const isIncome = quickType === "CREDIT";
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

  const getMonthYY = useCallback((dStr: string) => {
    const dt = new Date(dStr || todayStr);
    const m = dt.toLocaleString("default", { month: "short" });
    const y = String(dt.getFullYear()).slice(2);
    return `${m}-${y}`;
  }, [todayStr]);

  // Default name to [Category/Bank Name] [Month-YY] when picker changes if name not manually filled
  useEffect(() => {
    const monthYY = getMonthYY(quickDate);
    if (!isIncome && quickCategoryId) {
      const cat = categories.find((c) => c.id === quickCategoryId);
      if (cat) {
        setQuickName(`${cat.name} ${monthYY}`);
      }
    } else if (isIncome && quickReceivingAccountId) {
      const acc = bankAccounts.find((a) => a.id === quickReceivingAccountId);
      if (acc) {
        setQuickName(`${acc.name} ${monthYY}`);
      }
    }
  }, [
    quickCategoryId,
    quickReceivingAccountId,
    isIncome,
    quickDate,
    categories,
    bankAccounts,
    setQuickName,
    getMonthYY,
  ]);

  const everydayCats = categories.filter((c) => c.type === "EVERYDAY");
  const regularCats = categories.filter((c) => c.type === "REGULAR");
  const goalCats = categories.filter((c) => c.type === "GOAL");

  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
      <div className="flex rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => {
            setQuickType("DEBIT");
            setQuickName("");
          }}
          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            !isIncome
              ? "bg-rose-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>💸</span>
          <span>I spent...</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setQuickType("CREDIT");
            setQuickName("");
          }}
          className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            isIncome
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>💰</span>
          <span>I received...</span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* Selector First */}
        {!isIncome ? (
          <select
            value={quickCategoryId}
            onChange={(e) => setQuickCategoryId(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white font-semibold"
          >
            <option value="">Select Category (Mandatory)...</option>
            {everydayCats.length > 0 && (
              <optgroup label="Everyday Expenses">
                {everydayCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                  </option>
                ))}
              </optgroup>
            )}
            {regularCats.length > 0 && (
              <optgroup label="Bills & Obligations">
                {regularCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                  </option>
                ))}
              </optgroup>
            )}
            {goalCats.length > 0 && (
              <optgroup label="Savings Goals">
                {goalCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        ) : (
          <select
            value={quickReceivingAccountId}
            onChange={(e) => setQuickReceivingAccountId(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white font-semibold"
          >
            <option value="">Select Receiving Bank Account (Mandatory)...</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder={isIncome ? "Income Description" : "Expense Description"}
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          required
          className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount ($)"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] font-mono"
          />
          <input
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] font-mono"
          />
        </div>

        <input
          type="text"
          placeholder="Notes / Description (optional)"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />

        <button
          type="submit"
          disabled={isPending}
          className={`py-2.5 rounded-xl text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all shadow-sm ${
            isIncome ? "bg-emerald-600" : "bg-[#00B4A6]"
          }`}
        >
          {isPending
            ? "Processing..."
            : isIncome
            ? "Record Income Transaction"
            : "Record Expense Transaction"}
        </button>

        {quickMsg && (
          <div className="p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 animate-in fade-in duration-200">
            {quickMsg}
          </div>
        )}
      </form>
    </div>
  );
}
