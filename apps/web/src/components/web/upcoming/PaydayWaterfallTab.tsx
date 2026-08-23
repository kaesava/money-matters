"use client";

import React from "react";
import { InfoTooltip } from "@money-matters/ui/web";
import { PaydayLineRow } from "./PaydayLineRow";

export interface PaydayWaterfallTabProps {
  everydayAllocated: number;
  regularAllocated: number;
  goalAllocated: number;
  totalAllocated: number;
  numericActual: number;
  lines: Array<{
    bucketId: string;
    bucketName: string;
    reasoning: string;
    proposedAmount: number;
  }>;
  linesMap: Record<string, string>;
  setLinesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  categories: Array<{ id: string; type?: string; currentBalance?: string; healthStatus?: string }>;
  onShowReasoning: (name: string, reason: string) => void;
  isFutureDate: boolean;
}

export function PaydayWaterfallTab({
  everydayAllocated,
  regularAllocated,
  goalAllocated,
  totalAllocated,
  numericActual,
  lines,
  linesMap,
  setLinesMap,
  categories,
  onShowReasoning,
  isFutureDate,
}: PaydayWaterfallTabProps) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-150">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-emerald-800">Everyday Pool</span>
            <InfoTooltip content="Discretionary cash for groceries, dining, and daily spending." />
          </div>
          <span className="text-base font-black text-[#1B2B4B]">
            ${everydayAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-blue-800">Bills & Fixed</span>
            <InfoTooltip content="Automated allocations reserved for upcoming recurring bills." />
          </div>
          <span className="text-base font-black text-[#1B2B4B]">
            ${regularAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-indigo-800">Savings Goals</span>
            <InfoTooltip content="Allocations routed directly into your goal pools." />
          </div>
          <span className="text-base font-black text-[#1B2B4B]">
            ${goalAllocated.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Payday Category Distribution List */}
      {lines.length > 0 ? (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B2B4B]">Category Split Breakdown</span>
            <span className="text-[11px] font-semibold text-zinc-500">
              Allocating <strong className="text-[#1B2B4B]">${totalAllocated.toFixed(2)}</strong> of ${numericActual.toFixed(2)}
            </span>
          </div>
          {lines.map((line) => {
            const cat = categories.find((c) => c.id === line.bucketId);
            const curBal = cat ? parseFloat(cat.currentBalance || "0") : 0;
            return (
              <PaydayLineRow
                key={line.bucketId}
                bucketId={line.bucketId}
                bucketName={line.bucketName}
                categoryType={cat?.type}
                reasoning={line.reasoning}
                amountVal={linesMap[line.bucketId] ?? line.proposedAmount.toFixed(2)}
                onAmountChange={(val) => setLinesMap((prev) => ({ ...prev, [line.bucketId]: val }))}
                onShowReasoning={onShowReasoning}
                categoryBalance={curBal}
                healthStatus={cat?.healthStatus as "GREEN" | "AMBER" | "RED" | null}
                isFutureDate={isFutureDate}
              />
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
          Enter an income amount in Deposit Details to preview your automated Payday Waterfall split.
        </div>
      )}
    </div>
  );
}
