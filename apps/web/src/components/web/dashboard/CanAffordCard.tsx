import React from "react";
import { CanAffordVerdictType } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui/web";

interface CanAffordCardProps {
  canAffordAmount: string;
  setCanAffordAmount: (amt: string) => void;
  canAffordData?: CanAffordVerdictType | null;
}

export function CanAffordCard({
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
}: CanAffordCardProps) {


  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-[#1B2B4B]">Can We Afford This?</h3>
        <InfoTooltip
          title="Affordability Decision Engine"
          content="Evaluates spendable Everyday cash after reserving upcoming bills due before your next payday ($15/day safety pacing floor)."
        />
      </div>
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
          className={`p-3 rounded-xl text-xs font-semibold flex flex-col gap-2 transition-all ${
            canAffordData.verdict === "SAFE_YES"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-950"
              : canAffordData.verdict === "PACING_WARNING"
              ? "bg-amber-50 border border-amber-200 text-amber-950"
              : canAffordData.verdict === "IMPACT_GOALS"
              ? "bg-orange-50 border border-orange-200 text-orange-950"
              : canAffordData.verdict === "WAIT_FOR_PAYDAY"
              ? "bg-blue-50 border border-blue-200 text-blue-950"
              : "bg-rose-50 border border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between font-bold text-sm">
            <span>
              {canAffordData.verdict === "SAFE_YES" && "🟢 Yes, Safe to Buy"}
              {canAffordData.verdict === "PACING_WARNING" && "🟡 Yes, but Tight Daily Pacing"}
              {canAffordData.verdict === "IMPACT_GOALS" && "🟠 Yes, Dips into Savings"}
              {canAffordData.verdict === "WAIT_FOR_PAYDAY" && "🔵 Wait for Payday"}
              {canAffordData.verdict === "HARD_NO" && "🔴 No, Do Not Buy"}
            </span>
            <span className="font-mono text-xs opacity-80">
              {canAffordData.verdict === "SAFE_YES" && `$${canAffordData.dailyPacingAfterSpend}/day left`}
              {canAffordData.verdict === "PACING_WARNING" && `$${canAffordData.dailyPacingAfterSpend}/day left`}
              {canAffordData.verdict === "IMPACT_GOALS" && `$${canAffordData.goalSurplusUsed} from ${canAffordData.affectedGoalName}`}
              {canAffordData.verdict === "WAIT_FOR_PAYDAY" && `${canAffordData.daysUntilNextPaycheck}d away`}
              {canAffordData.verdict === "HARD_NO" && `Shortfall -$${canAffordData.shortfall}`}
            </span>
          </div>

          {/* Reasoning Rationale Waterfall Breakdown */}
          <div className="pt-2 border-t border-black/10 space-y-1 text-[11px] font-mono leading-relaxed">
            {canAffordData.rationaleSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="opacity-60">•</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
