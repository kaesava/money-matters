import React from "react";

interface PaydayLineRowProps {
  bucketId: string;
  bucketName: string;
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
  bucketId,
  bucketName,
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

  return (
    <div className="p-3 rounded-xl bg-white border border-zinc-100 flex flex-col gap-2 shadow-2xs hover:border-zinc-200 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <p className="text-xs font-bold truncate text-[#1B2B4B]">{bucketName}</p>
          {reasoning && (
            <button
              type="button"
              onClick={() => onShowReasoning(bucketName, reasoning)}
              className="text-[10px] font-bold text-[#00B4A6] hover:underline"
              title="Click to see full allocation reason"
            >
              ⓘ Why this amount?
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-bold text-zinc-400">$</span>
          <input
            type="number"
            step="0.01"
            value={amountVal}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-24 px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 text-right focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-50 p-1.5 rounded-lg">
        <span>Balance Before: <strong className="text-zinc-800">{fmt(categoryBalance)}</strong></span>
        <span>Projected After: <strong className="text-[#1B2B4B]">{fmt(projectedAfter)}</strong></span>
        {isFutureDate && healthStatus && (
          <span
            className={`font-extrabold px-1.5 py-0.5 rounded-full ${
              healthStatus === "GREEN"
                ? "bg-emerald-100 text-emerald-800"
                : healthStatus === "AMBER"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {healthStatus}
          </span>
        )}
      </div>
    </div>
  );
}
