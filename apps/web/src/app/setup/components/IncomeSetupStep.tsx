import React from "react";

interface IncomeSetupStepProps {
  incomeName: string;
  setIncomeName: (val: string) => void;
  incomeType: "SALARY" | "FREELANCE" | "OTHER";
  setIncomeType: (val: "SALARY" | "FREELANCE" | "OTHER") => void;
  incomeAmount: string;
  setIncomeAmount: (val: string) => void;
  incomeFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  setIncomeFreq: (val: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY") => void;
  incomeStartDate: string;
  setIncomeStartDate: (val: string) => void;
  addedIncome: string[];
  addingIncome: boolean;
  onAddIncome: () => void;
  onNext: () => void;
}

export function IncomeSetupStep({
  incomeName,
  setIncomeName,
  incomeType,
  setIncomeType,
  incomeAmount,
  setIncomeAmount,
  incomeFreq,
  setIncomeFreq,
  incomeStartDate,
  setIncomeStartDate,
  addedIncome,
  addingIncome,
  onAddIncome,
  onNext,
}: IncomeSetupStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-[#1B2B4B]">Step 1: Your Income Sources</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Tell us about your recurring paychecks or irregular income so we can automatically calculate your payday allocations.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Income Name</label>
            <input
              type="text"
              placeholder="e.g. Primary Job Salary, Freelance Client"
              value={incomeName}
              onChange={(e) => setIncomeName(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Type</label>
            <select
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value as "SALARY" | "FREELANCE" | "OTHER")}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="SALARY">Salary / Wages</option>
              <option value="FREELANCE">Freelance / Contracting</option>
              <option value="OTHER">Other Income</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Expected Net Amount ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 2500.00"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Frequency</label>
            <select
              value={incomeFreq}
              onChange={(e) => setIncomeFreq(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY")}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="FORTNIGHTLY">Fortnightly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">First Pay Date</label>
            <input
              type="date"
              value={incomeStartDate}
              onChange={(e) => setIncomeStartDate(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>
        </div>

        <button
          onClick={onAddIncome}
          disabled={addingIncome || !incomeName.trim() || !incomeAmount.trim()}
          className="self-end px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          {addingIncome ? "Adding..." : "+ Add Income Source"}
        </button>
      </div>

      {addedIncome.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Added Income Sources:</span>
          <div className="flex flex-wrap gap-2">
            {addedIncome.map((inc, i) => (
              <span key={i} className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold">
                ✓ {inc}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-md"
        >
          Next: Choose Categories →
        </button>
      </div>
    </div>
  );
}
