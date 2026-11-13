import React from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../providers/LocaleProvider";

export interface GoalPresetConfig {
  name: string;
  nameKey: string;
  fundingMode: "TARGET_BALANCE" | "RECURRING";
  icon: string;
  defaultTarget: number;
  defaultMonths?: number;
}

export const PRESET_GOALS: GoalPresetConfig[] = [
  // 3 Target Balance Goals
  {
    name: "Annual Family Holiday",
    nameKey: "setup.goals.presetHoliday",
    fundingMode: "TARGET_BALANCE",
    icon: "plane",
    defaultTarget: 5000,
    defaultMonths: 12,
  },
  {
    name: "Car / Vehicle",
    nameKey: "setup.goals.presetVehicle",
    fundingMode: "TARGET_BALANCE",
    icon: "car",
    defaultTarget: 15000,
    defaultMonths: 24,
  },
  {
    name: "Tech Upgrade",
    nameKey: "setup.goals.presetTech",
    fundingMode: "TARGET_BALANCE",
    icon: "laptop",
    defaultTarget: 1500,
    defaultMonths: 6,
  },
  // 3 Recurring Goals
  {
    name: "Emergency Reserve",
    nameKey: "setup.goals.presetEmergency",
    fundingMode: "RECURRING",
    icon: "shield",
    defaultTarget: 300,
  },
  {
    name: "Education Fund",
    nameKey: "setup.goals.presetEducation",
    fundingMode: "RECURRING",
    icon: "book",
    defaultTarget: 200,
  },
  {
    name: "Wealth Building",
    nameKey: "setup.goals.presetWealth",
    fundingMode: "RECURRING",
    icon: "trending-up",
    defaultTarget: 400,
  },
];

interface SetupGoalsPresetsGridProps {
  onTogglePreset: (preset: GoalPresetConfig) => void;
  isPresetActive: (name: string) => boolean;
  isAud?: boolean;
}

export function SetupGoalsPresetsGrid({
  onTogglePreset,
  isPresetActive,
  isAud = true,
}: SetupGoalsPresetsGridProps) {
  const { fmt } = useLocale();
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-black text-[#1B2B4B]">
        {t("setup.goals.popularPresets")}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESET_GOALS.map((preset) => {
          const active = isPresetActive(preset.name);
          const isOngoing = preset.fundingMode === "RECURRING";
          const displayLabel = t(preset.nameKey as unknown as Parameters<typeof t>[0]);

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onTogglePreset(preset)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                active
                  ? "bg-blue-50/90 border-[#2563eb] shadow-xs ring-1 ring-[#2563eb]"
                  : "bg-white border-zinc-200 hover:border-blue-300 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B2B4B] line-clamp-1">
                  {displayLabel}
                </span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ml-2 ${
                    active ? "bg-[#2563eb] text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {active ? "✓" : "+"}
                </span>
              </div>
              <div className="mt-1">
                <div className="text-xs font-bold text-[#1B2B4B] line-clamp-1">
                  {displayLabel}
                </div>
                <div className="text-[11px] font-semibold text-zinc-500 mt-0.5 font-mono">
                  {isOngoing
                    ? `${fmt(isAud ? preset.defaultTarget : 0)} ${t("setup.freqSuffixMo")}`
                    : `${t("setup.goals.targetAmountLabel")}: ${fmt(isAud ? preset.defaultTarget : 0)}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
