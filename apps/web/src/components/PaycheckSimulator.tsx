"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";

export const PaycheckSimulator: React.FC = () => {
  const [paycheckAmount, setPaycheckAmount] = useState(2500);

  // 5-Step Waterfall Breakdown Calculations
  const deficitRepair = 0; // Baseline assumption $0 deficit
  const billsTargetCap = 1200;
  const billsAlloc = Math.min(billsTargetCap, Math.max(0, paycheckAmount - deficitRepair));

  const committedGoalsTarget = 400;
  const committedGoalsAlloc = Math.min(committedGoalsTarget, Math.max(0, paycheckAmount - deficitRepair - billsAlloc));

  const everydayTargetCap = 600;
  const everydayAlloc = Math.min(everydayTargetCap, Math.max(0, paycheckAmount - deficitRepair - billsAlloc - committedGoalsAlloc));

  const surplusSweepAlloc = Math.max(0, paycheckAmount - deficitRepair - billsAlloc - committedGoalsAlloc - everydayAlloc);

  return (
    <section id="simulator" className="bg-white border-y border-[#e2e4e0] py-20">
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
        {/* Left Column: Interactive Slider */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase w-fit">
            ⚡ Interactive Demo
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.simulatorTitle")}
          </h2>
          <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
            {t("landing.simulatorDescription")}
          </p>
          <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-[#e2e4e0] flex flex-col gap-5 shadow-sm">
            <div className="flex justify-between items-baseline font-bold text-sm">
              <span className="text-[#1B2B4B]">{t("landing.simulatedPaycheck")}</span>
              <span className="text-[#2563eb] text-2xl font-mono tracking-tight font-extrabold">
                ${paycheckAmount.toLocaleString()} <span className="text-xs font-normal text-zinc-500">AUD</span>
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={paycheckAmount}
              onChange={(e) => setPaycheckAmount(Number(e.target.value))}
              className="w-full accent-[#2563eb] cursor-pointer h-2 bg-zinc-200 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>$500</span>
              <span>$2,500</span>
              <span>$5,000</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live 5-Step Waterfall Waterfall Card */}
        <div className="md:col-span-7 bg-[#F7F8FA] p-6 md:p-8 rounded-2xl border border-[#e2e4e0] shadow-sm flex flex-col gap-5">
          <div className="flex justify-between items-center border-b border-[#e2e4e0] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("landing.realTimeRecs")}
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Automated Waterfall
            </span>
          </div>

          {/* Step 1: Unified Bills Pool */}
          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1B2B4B] text-xs md:text-sm">
                {t("landing.waterfallStep1")}
              </span>
              <span className={`${billsAlloc >= billsTargetCap ? "text-[#22c55e]" : "text-amber-600"} font-mono font-bold text-xs md:text-sm`}>
                ${billsAlloc.toFixed(0)} / ${billsTargetCap.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[#F7F8FA] h-3 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-[#2563eb] h-full rounded-full transition-all duration-300"
                style={{ width: `${(billsAlloc / billsTargetCap) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">{t("landing.rentMortgage")}</span>
          </div>

          {/* Step 2: Committed Goals */}
          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1B2B4B] text-xs md:text-sm">
                {t("landing.waterfallStep2")}
              </span>
              <span className={`${committedGoalsAlloc >= committedGoalsTarget ? "text-[#22c55e]" : "text-amber-600"} font-mono font-bold text-xs md:text-sm`}>
                ${committedGoalsAlloc.toFixed(0)} / ${committedGoalsTarget.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[#F7F8FA] h-3 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(committedGoalsAlloc / committedGoalsTarget) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">{t("landing.emergencySavings")}</span>
          </div>

          {/* Step 3: Everyday Discretionary */}
          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1B2B4B] text-xs md:text-sm">
                {t("landing.waterfallStep3")}
              </span>
              <span className="text-[#2563eb] font-mono font-bold text-xs md:text-sm">
                ${everydayAlloc.toFixed(0)} / ${everydayTargetCap.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-[#F7F8FA] h-3 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-[#22c55e] h-full rounded-full transition-all duration-300"
                style={{ width: `${(everydayAlloc / everydayTargetCap) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">{t("landing.everydaySpending")}</span>
          </div>

          {/* Step 4: Surplus Sweep */}
          <div className="bg-white p-4 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1B2B4B] text-xs md:text-sm">
                {t("landing.waterfallStep4")}
              </span>
              <span className="text-emerald-700 font-mono font-bold text-xs md:text-sm">
                +${surplusSweepAlloc.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-[#F7F8FA] h-3 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (surplusSweepAlloc / 1000) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">Auto-swept into Surplus Target & Offset Reserve</span>
          </div>
        </div>
      </div>
    </section>
  );
};

