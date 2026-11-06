import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";

interface LifestyleDiscretionarySlidersProps {
  weeklyGroceries: number;
  setWeeklyGroceries: (val: number) => void;
  weeklyDining: number;
  setWeeklyDining: (val: number) => void;
  weeklyPersonal: number;
  setWeeklyPersonal: (val: number) => void;
  isZeroBased?: boolean;
}

export function LifestyleDiscretionarySliders({
  weeklyGroceries,
  setWeeklyGroceries,
  weeklyDining,
  setWeeklyDining,
  weeklyPersonal,
  setWeeklyPersonal,
  isZeroBased = false,
}: LifestyleDiscretionarySlidersProps) {
  const { fmt } = useLocale();
  const totalWeekly = weeklyGroceries + weeklyDining + weeklyPersonal;

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-zinc-200/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          {t("setup.lifestyle.spendingTitle")}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 font-mono">
            {t("setup.lifestyle.everydaySpendingEstimate", { amount: fmt(totalWeekly) })}
          </span>
          <InfoTooltip
            title={t("setup.lifestyle.everydaySpendingTooltipTitle")}
            content={t("setup.lifestyle.everydaySpendingTooltipContent")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
          <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
            <span>{t("setup.lifestyle.groceries")}</span>
            <span className="text-[#2563eb] font-mono">{fmt(weeklyGroceries)}/wk</span>
          </div>
          <input
            type="range"
            min={isZeroBased ? "0" : "100"}
            max="600"
            step="10"
            value={weeklyGroceries}
            onChange={(e) => setWeeklyGroceries(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
          />
        </div>

        <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
          <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
            <span>{t("setup.lifestyle.dining")}</span>
            <span className="text-[#2563eb] font-mono">{fmt(weeklyDining)}/wk</span>
          </div>
          <input
            type="range"
            min={isZeroBased ? "0" : "50"}
            max="500"
            step="10"
            value={weeklyDining}
            onChange={(e) => setWeeklyDining(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
          />
        </div>

        <div className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-200">
          <div className="flex justify-between items-center text-xs font-bold text-[#1B2B4B]">
            <span>{t("setup.lifestyle.personalBuffer")}</span>
            <span className="text-[#2563eb] font-mono">{fmt(weeklyPersonal)}/wk</span>
          </div>
          <input
            type="range"
            min={isZeroBased ? "0" : "20"}
            max="400"
            step="10"
            value={weeklyPersonal}
            onChange={(e) => setWeeklyPersonal(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
          />
        </div>
      </div>
    </div>
  );
}
