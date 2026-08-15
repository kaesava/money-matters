"use client";

import React from "react";

interface PaydayLineRowProps {
  bucketId: string;
  bucketName: string;
  categoryType?: "EVERYDAY" | "REGULAR" | "GOAL" | string;
  reasoning: string;
  amountVal: string;
  onAmountChange: (val: string) => void;
  onShowReasoning: (name: string, reason: string) => void;
  categoryBalance?: number;
  healthStatus?: "GREEN" | "AMBER" | "RED" | null;
  isFutureDate: boolean;
}

function fmt(val: number) {
  return `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaydayLineRow({
  bucketId: _bucketId,
  bucketName,
  categoryType = "REGULAR",
  reasoning,
  amountVal,
  onAmountChange,
  onShowReasoning,
  categoryBalance = 0,
  healthStatus,
  isFutureDate,
}: PaydayLineRowProps) {
  const numericAdd = parseFloat(amountVal) || 0;
  const projectedAfter = categoryBalance + numericAdd;

  const badgeStyle =
    categoryType === "EVERYDAY"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : categoryType === "GOAL"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  const poolLabel =
    categoryType === "EVERYDAY" ? "Everyday Pool" : categoryType === "GOAL" ? "Savings Goal" : "Bills Pool";

  return (
    <div className="p-3.5 rounded-xl bg-white border border-zinc-200 flex flex-col gap-2.5 shadow-xs hover:border-zinc-300 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
            {poolLabel}
          </span>
          <p className="text-xs font-bold truncate text-[#1B2B4B]">{bucketName}</p>
          {reasoning && (
            <button
              type="button"
              onClick={() => onShowReasoning(bucketName, reasoning)}
              className="text-xs font-bold text-[#00B4A6] hover:underline flex items-center gap-0.5 shrink-0"
              title="Click to see allocation reasoning"
            >
              <span>ⓘ</span>
              <span className="hidden sm:inline">Why this amount?</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-zinc-400">$</span>
          <input
            type="number"
            step="0.01"
            value={amountVal}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-28 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6] bg-zinc-50/50"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-50/80 p-2 rounded-lg border border-zinc-100">
        <span>Current Balance: <strong className="text-zinc-800 font-bold">{fmt(categoryBalance)}</strong></span>
        <span>After Payday: <strong className="text-emerald-700 font-bold">{fmt(projectedAfter)}</strong></span>
        {isFutureDate && healthStatus && (
          <span
            className={`font-extrabold text-[10px] px-2 py-0.5 rounded-full ${
              healthStatus === "GREEN"
                ? "bg-emerald-100 text-emerald-800"
                : healthStatus === "AMBER"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {healthStatus === "GREEN" ? "On Track" : healthStatus === "AMBER" ? "Needs Attention" : "Behind Target"}
          </span>
        )}
      </div>
    </div>
  );
}
