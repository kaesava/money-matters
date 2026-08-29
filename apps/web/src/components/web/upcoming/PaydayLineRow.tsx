import React from "react";
import { t } from "@money-matters/i18n";

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

export function PaydayLineRow({
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
  const currentVal = parseFloat(amountVal || "0");
  const projectedAfter = categoryBalance + currentVal;

  const fmt = (num: number) =>
    `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-3.5 rounded-xl border border-zinc-200/80 bg-white shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#1B2B4B]">{bucketName}</span>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase">
            {categoryType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reasoning && (
            <button
              type="button"
              onClick={() => onShowReasoning(bucketName, reasoning)}
              className="p-1 text-zinc-400 hover:text-[#00B4A6] transition-colors cursor-pointer"
              title="View system reasoning"
            >
              ℹ️
            </button>
          )}
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
        <span>{t("payday.currentBalance")} <strong className="text-zinc-800 font-bold">{fmt(categoryBalance)}</strong></span>
        <span>{t("payday.afterPayday")} <strong className="text-emerald-700 font-bold">{fmt(projectedAfter)}</strong></span>
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
