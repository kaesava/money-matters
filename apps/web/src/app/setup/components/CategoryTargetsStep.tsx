import React from "react";
import { PresetCategory } from "./CategorySelectStep.js";

interface CategoryTargetsStepProps {
  selectedList: PresetCategory[];
  targets: Record<string, string>;
  setTarget: (id: string, val: string) => void;
  frequencies: Record<string, string>;
  setFrequency: (id: string, val: string) => void;
  targetDates: Record<string, string>;
  setTargetDate: (id: string, val: string) => void;
  defaultExcessId: string;
  setDefaultExcessId: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CategoryTargetsStep({
  selectedList,
  targets,
  setTarget,
  frequencies,
  setFrequency,
  targetDates,
  setTargetDate,
  defaultExcessId,
  setDefaultExcessId,
  onBack,
  onNext,
}: CategoryTargetsStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-[#1B2B4B]">Step 3: Target Amounts, Dates & Priorities</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Specify target amounts, target dates, and select your default excess surplus category.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {selectedList.map((cat) => (
          <div key={cat.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                  {defaultExcessId === cat.id && (
                    <span className="text-[10px] font-bold text-[#00B4A6] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      Excess Pool
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-semibold">{cat.type}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={targets[cat.id] || ""}
                  onChange={(e) => setTarget(cat.id, e.target.value)}
                  className="w-24 px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Frequency</label>
                <select
                  value={frequencies[cat.id] || "MONTHLY"}
                  onChange={(e) => setFrequency(cat.id, e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                >
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Date</label>
                <input
                  type="date"
                  value={targetDates[cat.id] || ""}
                  onChange={(e) => setTargetDate(cat.id, e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              <button
                type="button"
                onClick={() => setDefaultExcessId(cat.id)}
                className={`mt-4 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  defaultExcessId === cat.id
                    ? "bg-[#00B4A6] text-white"
                    : "bg-zinc-200/80 text-zinc-600 hover:bg-zinc-300"
                }`}
                title="Nominate as default excess pool for surplus allocations"
              >
                {defaultExcessId === cat.id ? "✓ Excess Pool" : "Set Excess"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-md"
        >
          Next: Bank Accounts →
        </button>
      </div>
    </div>
  );
}
