import React from "react";

interface DashboardHeaderHeroProps {
  nextPaydayEvent: {
    id: string;
    sourceName?: string | null;
    actualAmount?: string | null;
    expectedAmount: string;
    expectedDate: string;
  } | null;
  daysUntilPayday: number | null;
  fmt: (val: string | number) => string;
  fmtAUDate: (dStr: string) => string;
  onProcessPayday: (eventId: string) => void;
  onQuickApprovePayday?: (eventId: string, amount: string) => void;
}

export function DashboardHeaderHero({
  nextPaydayEvent,
  daysUntilPayday,
  fmt,
  fmtAUDate,
  onProcessPayday,
  onQuickApprovePayday,
}: DashboardHeaderHeroProps) {
  if (!nextPaydayEvent) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#1B2B4B] to-[#2C426E] text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/50">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00B4A6]/20 border border-[#00B4A6]/40 flex items-center justify-center text-2xl flex-shrink-0">
          📅
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#00B4A6]">
              Next Payday Ready
            </span>
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {daysUntilPayday !== null && daysUntilPayday <= 0
                ? "DUE TODAY!"
                : `In ${daysUntilPayday} days`}
            </span>
          </div>
          <h3 className="text-lg font-black text-white">
            {nextPaydayEvent.sourceName || "Income Deposit"} — {fmt(nextPaydayEvent.actualAmount || nextPaydayEvent.expectedAmount)} AUD
          </h3>
          <p className="text-xs text-slate-300 font-semibold">
            Scheduled for {fmtAUDate(nextPaydayEvent.expectedDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onQuickApprovePayday && (
          <button
            onClick={() => onQuickApprovePayday(nextPaydayEvent.id, nextPaydayEvent.expectedAmount)}
            className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-slate-900/80 hover:bg-slate-900 active:scale-95 transition-all border border-slate-700 shadow-xs flex items-center gap-1.5 flex-shrink-0"
          >
            <span>⚡ 1-Tap Quick Approve</span>
          </button>
        )}

        <button
          onClick={() => onProcessPayday(nextPaydayEvent.id)}
          className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-[#00B4A6] hover:bg-[#009b8f] active:scale-95 transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
        >
          <span>Edit & Review Split</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
