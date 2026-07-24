import React from "react";
import { CanAffordVerdictType } from "@money-matters/types";

interface CanAffordCardProps {
  canAffordAmount: string;
  setCanAffordAmount: (amt: string) => void;
  canAffordData?: CanAffordVerdictType | null;
  fmt: (val: string | number) => string;
}

export function CanAffordCard({
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
  fmt,
}: CanAffordCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-3">
      <h3 className="text-sm font-bold text-[#1B2B4B]">Can We Afford This?</h3>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Amount ($)"
          value={canAffordAmount}
          onChange={(e) => setCanAffordAmount(e.target.value)}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />
      </div>

      {canAffordData && (
        <div
          className={`p-3 rounded-xl text-xs font-bold ${
            canAffordData.verdict === "YES"
              ? "bg-emerald-50 text-emerald-800"
              : canAffordData.verdict === "YES_WITH_IMPACT"
              ? "bg-amber-50 text-amber-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {canAffordData.verdict === "YES" && `YES! Available in Everyday (${fmt(canAffordData.everydayRemaining)} left)`}
          {canAffordData.verdict === "YES_WITH_IMPACT" && `YES WITH IMPACT: Dips into savings (${canAffordData.affectedBucketName})`}
          {canAffordData.verdict === "WAIT" && `WAIT: Paycheck due in ${canAffordData.daysUntilNextPaycheck} days`}
          {canAffordData.verdict === "NO" && `NO: Shortfall of ${fmt(canAffordData.shortfall)}`}
        </div>
      )}
    </div>
  );
}
