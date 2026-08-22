"use client";

import React, { useState } from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { InfoTooltip, Spinner } from "@money-matters/ui/web";

interface SetupCategoriesStepProps {
  activeEveryday: EstimatedCategoryItem[];
  activeRegular: EstimatedCategoryItem[];
  activeGoals: EstimatedCategoryItem[];
  categoryFrequencies: Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">;
  setCategoryFrequencies: React.Dispatch<
    React.SetStateAction<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY">>
  >;
  setAmountOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRemoveCategory: (name: string) => void;
  customCatName: string;
  setCustomCatName: (val: string) => void;
  customCatType: "REGULAR" | "GOAL" | "EVERYDAY";
  setCustomCatType: (val: "REGULAR" | "GOAL" | "EVERYDAY") => void;
  customCatAmount: string;
  setCustomCatAmount: (val: string) => void;
  onAddCustomCategory: () => void;
  convertToMonthly: (amount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  convertFromMonthly: (monthlyAmount: number, freq: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY") => number;
  totalMonthlyIncomeAud: number;
  totalAllocatedMonthly: number;
  totalEverydayMonthly: number;
  totalRegularMonthly: number;
  totalGoalMonthly: number;
  isSubmitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export function SetupCategoriesStep({
  activeEveryday,
  activeRegular,
  activeGoals,
  categoryFrequencies,
  setCategoryFrequencies,
  setAmountOverrides,
  onRemoveCategory,
  customCatName,
  setCustomCatName,
  customCatType,
  setCustomCatType,
  customCatAmount,
  setCustomCatAmount,
  onAddCustomCategory,
  convertToMonthly,
  convertFromMonthly,
  totalMonthlyIncomeAud,
  totalAllocatedMonthly,
  totalEverydayMonthly,
  totalRegularMonthly,
  totalGoalMonthly,
  isSubmitting,
  onBack,
  onFinish,
}: SetupCategoriesStepProps) {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const handleAttemptRemove = (name: string) => {
    const lower = name.trim().toLowerCase();
    if (lower.includes("emergency") || lower.includes("surplus") || lower.includes("reserve")) {
      setWarningMsg(`"${name}" is designated as your Surplus Sweep Target and cannot be deleted.`);
      setTimeout(() => setWarningMsg(null), 4000);
      return;
    }
    onRemoveCategory(name);
  };

  const netSurplus = totalMonthlyIncomeAud - totalAllocatedMonthly;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[68vh] overflow-y-auto pr-1">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              ✓
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">Review &amp; Save Budget Summary</h2>
            <InfoTooltip
              title="Budget Summary"
              content="Based on your answers, we've estimated your monthly bills, goal funds, and everyday spending. When paychecks land, Money Matters automatically funds your bills and savings targets first."
            />
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Summary Preview
          </span>
        </div>
      </div>

      {warningMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center justify-between shadow-xs">
          <span>⚠️ {warningMsg}</span>
          <button type="button" onClick={() => setWarningMsg(null)} className="text-amber-600 hover:text-amber-900">
            ✕
          </button>
        </div>
      )}

      {/* Top Waterfall Summary Cards (Grid: 1-col on small screens, 3-col on md+) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-blue-700">Monthly Net Income</span>
          <span className="text-lg font-black text-[#1B2B4B]">${totalMonthlyIncomeAud.toLocaleString()}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-emerald-700">Total Allocated</span>
          <span className="text-lg font-black text-[#1B2B4B]">${totalAllocatedMonthly.toLocaleString()}</span>
        </div>
        <div
          className={`p-3.5 rounded-2xl border flex flex-col gap-1 ${
            netSurplus >= 0 ? "bg-teal-50/70 border-teal-200/80 text-teal-700" : "bg-red-50/70 border-red-200/80 text-red-700"
          }`}
        >
          <span className="text-[10px] font-black uppercase">Net Surplus / Deficit</span>
          <span className="text-lg font-black text-[#1B2B4B]">${netSurplus.toLocaleString()}</span>
        </div>
      </div>

      {/* Main Content Layout: 1-column on mobile/tablet, 2-column side-by-side on large screens (lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Everyday Spending & Regular Bills */}
        <div className="flex flex-col gap-6">
          {/* Everyday Spending Categories */}
          <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
                Everyday Spending Categories
              </span>
              <span className="text-xs font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Sub-total: ${totalEverydayMonthly.toLocaleString()}/mo
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {activeEveryday.map((cat) => {
                const freq = categoryFrequencies[cat.name] || "MONTHLY";
                const displayVal = convertFromMonthly(cat.monthlyAud, freq);
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon || "🛒"}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={displayVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const monthly = convertToMonthly(val, freq);
                          setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                        }}
                        className="w-20 px-2 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 font-mono"
                      />
                      <select
                        value={freq}
                        onChange={(e) => {
                          const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                          setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                        }}
                        className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-zinc-200 bg-slate-50 text-zinc-600"
                      >
                        <option value="WEEKLY">/ wk</option>
                        <option value="FORTNIGHTLY">/ fn</option>
                        <option value="MONTHLY">/ mo</option>
                        <option value="YEARLY">/ yr</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAttemptRemove(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regular Bills List */}
          <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
                Regular Bills &amp; Obligations
              </span>
              <span className="text-xs font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Sub-total: ${totalRegularMonthly.toLocaleString()}/mo
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
              {activeRegular.map((cat) => {
                const freq = categoryFrequencies[cat.name] || "MONTHLY";
                const displayVal = convertFromMonthly(cat.monthlyAud, freq);
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon || "📌"}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={displayVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const monthly = convertToMonthly(val, freq);
                          setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                        }}
                        className="w-20 px-2 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 font-mono"
                      />
                      <select
                        value={freq}
                        onChange={(e) => {
                          const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                          setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                        }}
                        className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-zinc-200 bg-slate-50 text-zinc-600"
                      >
                        <option value="WEEKLY">/ wk</option>
                        <option value="FORTNIGHTLY">/ fn</option>
                        <option value="MONTHLY">/ mo</option>
                        <option value="YEARLY">/ yr</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAttemptRemove(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Savings Goals & Add Custom Category */}
        <div className="flex flex-col gap-6">
          {/* Savings Goals */}
          <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
                Savings &amp; Future Goals
              </span>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Sub-total: ${totalGoalMonthly.toLocaleString()}/mo
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
              {activeGoals.map((cat) => {
                const isSurplusTarget =
                  cat.name.toLowerCase().includes("emergency") || cat.name.toLowerCase().includes("reserve");
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon || "🎯"}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                        {isSurplusTarget && (
                          <span className="text-[10px] font-bold text-teal-600">🛡️ Designated Surplus Sweep Target</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-zinc-700">${cat.monthlyAud}/mo</span>
                      <button
                        type="button"
                        onClick={() => handleAttemptRemove(cat.name)}
                        className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Category Form */}
          <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
            <span className="text-xs font-bold text-[#1B2B4B]">Add a Custom Category:</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customCatName}
                onChange={(e) => setCustomCatName(e.target.value)}
                placeholder="Category Name"
                className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
              />
              <select
                value={customCatType}
                onChange={(e) => setCustomCatType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
                className="px-2 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-slate-50"
              >
                <option value="REGULAR">Regular Bill</option>
                <option value="EVERYDAY">Everyday Spend</option>
                <option value="GOAL">Savings Goal</option>
              </select>
              <input
                type="number"
                value={customCatAmount}
                onChange={(e) => setCustomCatAmount(e.target.value)}
                placeholder="Monthly $"
                className="w-24 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 font-mono"
              />
              <button
                type="button"
                onClick={onAddCustomCategory}
                className="px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700"
        >
          ← Back to Lifestyle
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={isSubmitting}
          className="px-8 py-3 text-xs font-bold rounded-xl bg-[#22c55e] text-white hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Saving Setup...</span>
            </>
          ) : (
            <span>🚀 Save &amp; Complete Setup</span>
          )}
        </button>
      </div>
    </div>
  );
}
