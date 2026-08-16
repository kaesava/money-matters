"use client";

import React, { useState } from "react";

export interface PaydayTransferLine {
  categoryName: string;
  categoryType: "REGULAR" | "GOAL" | "EVERYDAY" | "PERSONAL";
  targetAccountName: string;
  amount: number;
  payID?: string;
  bsbAccount?: string;
}

export interface PaydayTransferCardProps {
  readonly paycheckAmount: number;
  readonly paycheckDate: string;
  readonly lines: PaydayTransferLine[];
  readonly onDismiss?: () => void;
}

const fmt = (val: number) => `$${val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PaydayTransferCard({
  paycheckAmount,
  paycheckDate,
  lines,
  onDismiss,
}: PaydayTransferCardProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (amount: number, idx: number) => {
    navigator.clipboard.writeText(amount.toFixed(2));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (lines.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full">
            1-Tap Payday Transfer Plan
          </span>
          <h3 className="text-sm font-extrabold text-[#1B2B4B] mt-1">
            Allocate {fmt(paycheckAmount)} Received on {paycheckDate}
          </h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-zinc-400 hover:text-zinc-600 font-bold px-2 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Copy each transfer amount below into your bank app (Osko / PayID) to fund your separate accounts:
      </p>

      <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
        {lines.map((line, idx) => (
          <div key={line.categoryName + idx} className="p-3 bg-zinc-50/50 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1B2B4B] truncate">{line.categoryName}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-200/60 px-1.5 py-0.5 rounded">
                  {line.categoryType}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Target: <strong className="text-zinc-700">{line.targetAccountName}</strong>
                {line.payID && ` • PayID: ${line.payID}`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-extrabold text-xs text-[#1B2B4B]">{fmt(line.amount)}</span>
              <button
                onClick={() => handleCopy(line.amount, idx)}
                className="px-2.5 py-1 text-[11px] font-bold text-[#2563eb] bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors flex items-center gap-1"
                title="Copy amount to clipboard for bank app"
              >
                {copiedIdx === idx ? "✓ Copied" : "Copy $"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PaydayTransferCard;
