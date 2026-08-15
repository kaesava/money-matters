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
      {/* Retention Hero Banner */}
      <div className="p-5 bg-gradient-to-br from-[#1B2B4B] to-[#2563eb] text-white rounded-2xl shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300 bg-white/10 px-3 py-1 rounded-full border border-teal-300/30">
            ⏱ Takes Under 2 Minutes • Zero Math Required
          </span>
          <span className="text-xs font-bold text-slate-300">Step 1 of 5</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
          Welcome to Money Matters! Let&apos;s put your cashflow on autopilot ✨
        </h2>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          Traditional budgeting fails because spreadsheets force manual tracking. Money Matters automatically routes every paycheck through a <strong>5-Step Payday Waterfall</strong> so your bills are paid, your savings grow, and your guilt-free spending is clear.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black text-[#1B2B4B]">💰 Take-Home Pay & Income</h3>
          <button
            type="button"
            onClick={() => setActiveTooltip(!activeTooltip)}
            className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
          >
            ℹ️
          </button>
        </div>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Enter your net take-home earnings (after tax). Add all regular income sources so we can calculate your exact payday allocation pool.
        </p>
        {activeTooltip && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
            <strong>Why we ask for this:</strong> Knowing your regular income allows us to calculate how much surplus cash you generate each month, funding your savings goals and protecting you against bill shortfalls before you spend a single dollar.
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
