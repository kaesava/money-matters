import React from "react";

interface Category {
  id: string;
  name: string;
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
  const [showDateField, setShowDateField] = React.useState(false);
  const isIncome = quickType === "CREDIT";
  const todayStr = new Date().toISOString().split("T")[0];
  const isFutureDate = quickDate > todayStr;

  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1B2B4B]">
          {isIncome ? "Quick Record Income" : "Quick Record Expense"}
        </h3>
        <span className="text-xs text-zinc-400">
          {isIncome ? "Deposit / Credit" : "Draw down"}
        </span>
      </div>

      <div className="flex rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setQuickType("DEBIT")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            !isIncome
              ? "bg-rose-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>💸</span>
          <span>Expense</span>
        </button>
        <button
          type="button"
          onClick={() => setQuickType("CREDIT")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            isIncome
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>💰</span>
          <span>Income</span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder={isIncome ? "Income Source Name e.g. Salary, Wages" : "Expense Bill Name e.g. Electric Bill"}
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          required
          className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />

        {!isIncome ? (
          <select
            value={quickCategoryId}
            onChange={(e) => setQuickCategoryId(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
          >
            <option value="">Select Category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
              </option>
            ))}
          </select>
        ) : (
          <select
            value={quickReceivingAccountId}
            onChange={(e) => setQuickReceivingAccountId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-white"
          >
            <option value="">Select Receiving Bank Account...</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className={showDateField ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1.5"}>
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
          {showDateField ? (
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              required
              className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDateField(true)}
              className="text-[11px] text-zinc-400 hover:text-[#00B4A6] text-left transition-colors font-medium px-1"
            >
              + Set custom date (default: today)
            </button>
          )}
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
            : isFutureDate
            ? isIncome
              ? "📅 Create Future Income Event"
              : "📅 Create Future Expense Event"
            : isIncome
            ? "Record Income & Payday Split"
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
