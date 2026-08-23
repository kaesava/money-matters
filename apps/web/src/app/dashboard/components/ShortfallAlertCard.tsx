"use client";

import React from "react";

export interface ShortfallAlertCardProps {
  billsShortfall: number;
  billsDue14DaysCount: number;
  totalBillsDue14Days: number;
  billsBalance: number;
  formatAUD: (val: number) => string;
  onMoveMoney: () => void;
}

export function ShortfallAlertCard({
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  billsBalance,
  formatAUD,
  onMoveMoney,
}: ShortfallAlertCardProps) {
  if (billsShortfall <= 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-lg">
          ⚠️
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
            Due-Date Shortfall Warning
          </span>
          <h4 className="text-xs font-bold text-[#1B2B4B] mt-0.5">
            Bills Pool Shortfall of <span className="font-mono text-amber-800 font-extrabold">{formatAUD(billsShortfall)}</span> Due in Next 14 Days
          </h4>
          <p className="text-[11px] text-amber-900 mt-0.5">
            You have {billsDue14DaysCount} upcoming bill(s) totaling {formatAUD(totalBillsDue14Days)} due before next pay, but current Bills pool has {formatAUD(billsBalance)}.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onMoveMoney}
        className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0 shadow-sm cursor-pointer"
      >
        Move Money →
      </button>
    </div>
  );
}
