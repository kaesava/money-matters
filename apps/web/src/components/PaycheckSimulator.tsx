"use client";

import React, { useState, useEffect, useCallback } from "react";
import { t } from "@money-matters/i18n";
import { computeSimulationState } from "./simulator/simulationData";
import { SimulatorTimelineBar } from "./simulator/SimulatorTimelineBar";
import { SimulatorEventCallout } from "./simulator/SimulatorEventCallout";
import { SimulatorPoolCard } from "./simulator/SimulatorPoolCard";

export const PaycheckSimulator: React.FC = () => {
  const [day, setDay] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Advance simulation automatically when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDay((prev) => (prev >= 28 ? 0 : prev + 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleDayChange = useCallback((newDay: number) => {
    setDay(newDay);
    setIsPlaying(false);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setDay(0);
    setIsPlaying(false);
  }, []);

  const state = computeSimulationState(day);

  return (
    <section id="simulator" className="bg-white border-y border-[#e2e4e0] py-20">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-10 items-start">
        {/* Left Column: Interactive Timeline Controls & Event Narrative */}
        <div className="md:col-span-6 flex flex-col gap-6 sticky top-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase w-fit">
            {t("landing.simTimelineBadge")}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("landing.simTimelineTitle")}
            </h2>
            <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
              {t("landing.simTimelineSubtitle")}
            </p>
          </div>

          {/* Timeline Scrubber Component */}
          <SimulatorTimelineBar
            day={day}
            isPlaying={isPlaying}
            onDayChange={handleDayChange}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
          />

          {/* Dynamic Event Callout */}
          <SimulatorEventCallout milestone={state.activeMilestone} />
        </div>

        {/* Right Column: Dynamic Pool Allocations */}
        <div className="md:col-span-6 bg-[#F7F8FA] p-6 md:p-8 rounded-3xl border border-[#e2e4e0] shadow-sm flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-[#e2e4e0] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("landing.realTimeRecs")}
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              {t("landing.autoCascading", { defaultValue: "Automated Payday Ring-Fencing" })}
            </span>
          </div>

          {/* STEP 1: BILLS POOL */}
          <SimulatorPoolCard pool={state.bills} />

          {/* STEP 2: COMMITTED GOALS */}
          <SimulatorPoolCard pool={state.goals} />

          {/* STEP 3: EVERYDAY LIVING */}
          <SimulatorPoolCard pool={state.everyday} />

          {/* STEP 4: SURPLUS SWEEP & MORTGAGE OFFSET */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                  STEP 4
                </span>
                <span className="font-extrabold text-[#1B2B4B] text-sm ml-2">
                  {t("landing.waterfallStep4")}
                </span>
              </div>
              <span className="text-[#22c55e] font-mono font-extrabold text-base tabular-nums">
                +${state.surplusOffset} AUD
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="bg-[#22c55e] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (state.surplusOffset / 1000) * 100)}%` }}
              />
            </div>

            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 flex items-center justify-between">
              <span>{t("landing.surplusOffset")}</span>
              <span className="font-mono font-bold">${state.surplusOffset}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
