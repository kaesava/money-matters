import React from "react";

interface Category {
  id: string;
  name: string;
  currentBalance: string;
}

interface QuickExpenseCardProps {
  categories: Category[];
  quickCategoryId: string;
  setQuickCategoryId: (id: string) => void;
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
  quickCategoryId,
  setQuickCategoryId,
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
  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1B2B4B]">Quick Add Expense</h3>
        <span className="text-xs text-zinc-400">Draw down</span>
      </div>

      {quickMsg && <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">{quickMsg}</div>}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <select
          value={quickCategoryId}
          onChange={(e) => setQuickCategoryId(e.target.value)}
          required
          className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        >
          <option value="">Select Category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (${parseFloat(c.currentBalance).toFixed(2)})
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Amount ($)"
            value={quickAmount}
            onChange={(e) => setQuickAmount(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
          <input
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            required
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        <input
          type="text"
          placeholder="Note (optional)"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />

        <button
          type="submit"
          disabled={isPending}
          className="py-2.5 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          {isPending ? "Recording..." : "Record Expense"}
        </button>
      </form>
    </div>
  );
}
