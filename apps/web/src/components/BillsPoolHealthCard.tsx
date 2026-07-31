"use client";

import React from "react";

export interface BillsPoolHealthProps {
  currentPoolBalance: number;
  upcomingBillsTotal: number;
  daysUntilNextPayday: number;
}

export const BillsPoolHealthCard: React.FC<BillsPoolHealthProps> = ({
  currentPoolBalance,
  upcomingBillsTotal,
  daysUntilNextPayday,
}) => {
  const netSurplus = currentPoolBalance - upcomingBillsTotal;
  const isDeficit = netSurplus < 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">💳</span>
          <h3 className="font-extrabold text-sm text-[#1B2B4B] uppercase tracking-wider">
            Bills Pool Health
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isDeficit ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isDeficit ? "Needs Top-Up" : "Safe & Covered"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400 font-medium">Bills Account Balance</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">
            ${currentPoolBalance.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Due Before Payday ({daysUntilNextPayday}d)</p>
          <p className="font-mono text-2xl font-bold text-slate-700 mt-1">
            ${upcomingBillsTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-semibold">
        <span className="text-slate-600">Buffer / Surplus:</span>
        <span className={`font-mono font-bold ${isDeficit ? "text-red-600" : "text-emerald-600"}`}>
          {isDeficit ? `-$${Math.abs(netSurplus).toFixed(2)}` : `+$${netSurplus.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
};
