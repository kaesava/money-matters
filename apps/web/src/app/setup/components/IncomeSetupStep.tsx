import React from "react";

interface IncomeSetupStepProps {
  incomeName: string;
  setIncomeName: (val: string) => void;
  incomeAmount: string;
  setIncomeAmount: (val: string) => void;
  incomeFreq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  setIncomeFreq: (val: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY") => void;
  onNext: () => void;
}

export function IncomeSetupStep({
  incomeName,
  setIncomeName,
  incomeAmount,
  setIncomeAmount,
  incomeFreq,
  setIncomeFreq,
  onNext,
}: IncomeSetupStepProps) {
  const isFormValid = incomeName.trim() !== "" && incomeAmount.trim() !== "" && parseFloat(incomeAmount) >= 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-[#1B2B4B]">💰 How much do you get paid?</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Let's set up your main income source. You can add more later in Settings.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Income Name</label>
          <input
            type="text"
            placeholder="e.g. My Salary"
            value={incomeName}
            onChange={(e) => setIncomeName(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Net Pay ($)</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 2500.00"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Frequency</label>
            <select
              value={incomeFreq}
              onChange={(e) => setIncomeFreq(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY")}
              className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="FORTNIGHTLY">Fortnightly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 font-semibold text-center italic">
        "You can add more income sources and bank accounts later in Settings."
      </p>

      <div className="flex justify-end pt-4 border-t border-zinc-100">
        <button
          onClick={onNext}
          disabled={!isFormValid}
          className="px-6 py-3 rounded-xl text-xs font-black text-white bg-[#1B2B4B] hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
        >
          Next: Choose Bills & Goals →
        </button>
      </div>
    </div>
  );
}
