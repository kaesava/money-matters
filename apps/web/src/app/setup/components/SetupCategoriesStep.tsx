"use client";

import React from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui/web";

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
  onBack: () => void;
  onNext: () => void;
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
  onBack,
  onNext,
}: SetupCategoriesStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#1B2B4B]">⚙️ Review Your Estimated Budget</h2>
          <InfoTooltip content="Based on your answers, we've estimated your monthly bills, goal funds, and everyday spending. Everyday spending categories pool together into your primary spending bucket while maintaining individual tracking tags." />
        </div>
      </div>

      {/* Everyday Spending Categories */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Everyday Spending Categories
        </span>
        {activeEveryday.map((cat) => {
          const freq = categoryFrequencies[cat.name] || "MONTHLY";
          const displayVal = convertFromMonthly(cat.monthlyAud, freq);
          return (
            <div
              key={cat.name}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-slate-50/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                {cat.rationale && <InfoTooltip title="Estimation Rationale" content={cat.rationale} />}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={displayVal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const monthly = convertToMonthly(val, freq);
                    setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                  }}
                  className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                />
                <select
                  value={freq}
                  onChange={(e) => {
                    const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                    setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                  }}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                >
                  <option value="WEEKLY">/ week</option>
                  <option value="FORTNIGHTLY">/ fortnight</option>
                  <option value="MONTHLY">/ month</option>
                  <option value="YEARLY">/ year</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(cat.name)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                  title="Remove category"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regular Bills List */}
      <div className="flex flex-col gap-3 pt-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Regular Bills & Obligations
        </span>
        {activeRegular.map((cat) => {
          const freq = categoryFrequencies[cat.name] || "MONTHLY";
          const displayVal = convertFromMonthly(cat.monthlyAud, freq);
          const isEssential =
            cat.name.toLowerCase().includes("mortgage") ||
            cat.name.toLowerCase().includes("rent") ||
            cat.name.toLowerCase().includes("electricity");
          return (
            <div
              key={cat.name}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-slate-50/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{cat.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                  {isEssential && (
                    <span className="text-[10px] font-semibold text-[#2563eb]">⭐ Essential Priority Bill</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={displayVal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const monthly = convertToMonthly(val, freq);
                    setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                  }}
                  className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                />
                <select
                  value={freq}
                  onChange={(e) => {
                    const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                    setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                  }}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                >
                  <option value="WEEKLY">/ week</option>
                  <option value="FORTNIGHTLY">/ fortnight</option>
                  <option value="MONTHLY">/ month</option>
                  <option value="YEARLY">/ year</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(cat.name)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                  title="Remove category"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal Sinking Funds List */}
      <div className="flex flex-col gap-3 pt-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Savings & Goal Funds
        </span>
        {activeGoals.map((cat) => {
          const freq = categoryFrequencies[cat.name] || "MONTHLY";
          const displayVal = convertFromMonthly(cat.monthlyAud, freq);
          const isSurplusTarget =
            cat.name.toLowerCase().includes("surplus") || cat.name.toLowerCase().includes("reserve");
          return (
            <div
              key={cat.name}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                isSurplusTarget ? "border-emerald-300 bg-emerald-50/40" : "border-zinc-200/80 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{cat.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                  {isSurplusTarget && (
                    <span className="text-[10px] font-semibold text-emerald-700">🏦 Designated Surplus Target</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={displayVal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const monthly = convertToMonthly(val, freq);
                    setAmountOverrides((prev) => ({ ...prev, [cat.name]: monthly }));
                  }}
                  className="w-24 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-white"
                />
                <select
                  value={freq}
                  onChange={(e) => {
                    const newFreq = e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "YEARLY";
                    setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: newFreq }));
                  }}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white text-zinc-600"
                >
                  <option value="WEEKLY">/ week</option>
                  <option value="FORTNIGHTLY">/ fortnight</option>
                  <option value="MONTHLY">/ month</option>
                  <option value="YEARLY">/ year</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(cat.name)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 px-1"
                  title="Remove category"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Category Form */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-100/60 rounded-xl border border-zinc-200/60">
        <span className="text-xs font-bold text-[#1B2B4B]">Add Custom Category</span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Category Name"
            value={customCatName}
            onChange={(e) => setCustomCatName(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
          />
          <select
            value={customCatType}
            onChange={(e) => setCustomCatType(e.target.value as "REGULAR" | "GOAL" | "EVERYDAY")}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
          >
            <option value="REGULAR">Regular Bill</option>
            <option value="GOAL">Savings Goal</option>
            <option value="EVERYDAY">Everyday Spend</option>
          </select>
          <input
            type="number"
            placeholder="Monthly ($)"
            value={customCatAmount}
            onChange={(e) => setCustomCatAmount(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white"
          />
          <button
            type="button"
            onClick={onAddCustomCategory}
            className="py-1.5 px-3 bg-[#1B2B4B] text-white text-xs font-bold rounded-lg hover:bg-slate-800"
          >
            + Add Category
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
        >
          Review Summary & Launch →
        </button>
      </div>
    </div>
  );
}
