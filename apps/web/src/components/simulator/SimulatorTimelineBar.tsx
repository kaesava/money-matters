"use client";

import React, { useId } from "react";
import { t } from "@money-matters/i18n";
import { SIMULATION_MILESTONES } from "./simulationData";

interface SimulatorTimelineBarProps {
  day: number;
  isPlaying: boolean;
  onDayChange: (newDay: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const SimulatorTimelineBar: React.FC<SimulatorTimelineBarProps> = ({
  day,
  isPlaying,
  onDayChange,
  onTogglePlay,
  onReset,
}) => {
  const sliderId = useId();

  return (
    <div className="bg-[#F7F8FA] p-5 md:p-6 rounded-2xl border border-[#e2e4e0] flex flex-col gap-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black font-mono text-[#2563eb] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            DAY {day} / 28
          </span>
          <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
            {t("landing.simScrubNotice")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? t("landing.simPause") : t("landing.simPlay")}</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
          >
            {t("landing.simReset")}
          </button>
        </div>
      </div>

      {/* Timeline Slider with Custom styling */}
      <div className="space-y-1.5">
        <div className="relative">
          <input
            id={sliderId}
            type="range"
            min="0"
            max="28"
            step="1"
            value={day}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="w-full accent-[#2563eb] cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
            aria-label={t("landing.simTimelineBadge")}
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-400 font-mono font-medium">
          <span>Day 0 (Pay #1)</span>
          <span>Day 14 (Pay #2)</span>
          <span>Day 28 (Goal Target)</span>
        </div>
      </div>

      {/* Quick-Jump Milestone Chips */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
        {SIMULATION_MILESTONES.map((m) => {
          const isActive = day === m.day;
          return (
            <button
              key={`milestone-${m.day}`}
              type="button"
              onClick={() => onDayChange(m.day)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                isActive
                  ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.badge}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
