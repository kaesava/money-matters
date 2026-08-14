"use client";

import React, { useState } from "react";
import { IncomeItem } from "@money-matters/types";

interface SetupIncomeStepProps {
  incomes: IncomeItem[];
  onAddIncome: () => void;
  onUpdateIncome: <K extends keyof IncomeItem>(id: string, field: K, value: IncomeItem[K]) => void;
  onRemoveIncome: (id: string) => void;
  onNext: () => void;
}

export function SetupIncomeStep({
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  onNext,
}: SetupIncomeStepProps) {
  const [activeTooltip, setActiveTooltip] = useState(false);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#1B2B4B]">💰 Income & Earnings</h2>
          <button
            type="button"
            onClick={() => setActiveTooltip(!activeTooltip)}
            className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
          >
            ℹ️
          </button>
        </div>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Enter your regular pay or earnings (take-home after tax). You can add as many income sources as needed.
        </p>
        {activeTooltip && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
            We use your take-home pay to calculate your monthly cashflow and build your automated 5-step waterfall budget allocations accurately.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
        {incomes.map((inc, index) => (
          <div key={inc.id} className="p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1B2B4B]">Income Source #{index + 1}</span>
              {incomes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveIncome(inc.id)}
                  className="text-xs font-bold text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-500">Label / Name</label>
                <input
                  type="text"
                  value={inc.name}
                  onChange={(e) => onUpdateIncome(inc.id, "name", e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                  placeholder="e.g. Salary, Consulting"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-500">Take-Home Amount ($)</label>
                <input
                  type="number"
                  value={inc.amount}
                  onChange={(e) => onUpdateIncome(inc.id, "amount", parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-500">Frequency</label>
                <select
                  value={inc.frequency}
                  onChange={(e) => onUpdateIncome(inc.id, "frequency", e.target.value as IncomeItem["frequency"])}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddIncome}
          className="py-2.5 px-4 bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
        >
          + Add Another Income Source
        </button>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
        >
          Continue to Lifestyle Questions →
        </button>
      </div>
    </div>
  );
}
