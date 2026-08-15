"use client";

import React from "react";
import { Spinner, InfoTooltip } from "@money-matters/ui/web";

interface SetupWaterfallStepProps {
  totalMonthlyIncomeAud: number;
  totalAllocatedMonthly: number;
  totalEverydayMonthly: number;
  totalRegularMonthly: number;
  totalGoalMonthly: number;
  isRerun: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export function SetupWaterfallStep({
  totalMonthlyIncomeAud,
  totalAllocatedMonthly,
  totalEverydayMonthly,
  totalRegularMonthly,
  totalGoalMonthly,
  isRerun,
  isSubmitting,
  onBack,
  onFinish,
}: SetupWaterfallStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#1B2B4B]">📊 Monthly Budget Plan Summary</h2>
          <InfoTooltip content="Here is how your total monthly income is distributed into your Everyday pool, Bills, and Savings goals. When paychecks land, Money Matters automatically funds your bills and savings targets first." />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-blue-700">Monthly Net Income</span>
          <span className="text-xl font-black text-[#1B2B4B]">${totalMonthlyIncomeAud.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase text-emerald-700">Total Allocated</span>
          <span className="text-xl font-black text-[#1B2B4B]">${totalAllocatedMonthly.toLocaleString()}</span>
        </div>
        <div
          className={`p-4 rounded-2xl border flex flex-col gap-1 ${
            totalMonthlyIncomeAud >= totalAllocatedMonthly
              ? "bg-teal-50/60 border-teal-200/80 text-teal-700"
              : "bg-red-50/60 border-red-200/80 text-red-700"
          }`}
        >
          <span className="text-[10px] font-black uppercase">Net Surplus / Deficit</span>
          <span className="text-xl font-black text-[#1B2B4B]">
            ${(totalMonthlyIncomeAud - totalAllocatedMonthly).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80 text-xs font-medium text-zinc-600">
        <div className="flex justify-between">
          <span>Everyday Spending Target:</span>
          <span className="font-bold text-[#1B2B4B]">${totalEverydayMonthly.toLocaleString()} / mo</span>
        </div>
        <div className="flex justify-between">
          <span>Regular Bills Target:</span>
          <span className="font-bold text-[#1B2B4B]">${totalRegularMonthly.toLocaleString()} / mo</span>
        </div>
        <div className="flex justify-between">
          <span>Savings & Goal Target:</span>
          <span className="font-bold text-[#1B2B4B]">${totalGoalMonthly.toLocaleString()} / mo</span>
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
          onClick={onFinish}
          disabled={isSubmitting}
          className="px-8 py-3 text-xs font-bold rounded-xl bg-[#22c55e] text-white hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Saving Budget...</span>
            </>
          ) : (
            <span>{isRerun ? "Apply Budget Changes ✨" : "Save & Complete Setup 🚀"}</span>
          )}
        </button>
      </div>
    </div>
  );
}
