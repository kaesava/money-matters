"use client";

import React, { useState, useId } from "react";
import { t } from "@money-matters/i18n";

export const PaycheckSimulator: React.FC = () => {
  const [paycheckAmount, setPaycheckAmount] = useState<number>(1000);
  const sliderId = useId();

  // -------------------------------------------------------------
  // 5-Step Waterfall Mathematical Model
  // -------------------------------------------------------------
  let rem = paycheckAmount;

  // Step 1: Bills Pool ($1,200 Total Cap)
  // Rent: $800 (Full Top-Up Priority 1)
  // Subs: $400 (Top-Up Priority 2 after Rent)
  const rentTarget = 800;
  const subsTarget = 400;
  const billsTargetCap = rentTarget + subsTarget; // $1,200

  const rentAlloc = Math.min(rentTarget, rem);
  rem -= rentAlloc;

  const subsAlloc = Math.min(subsTarget, rem);
  rem -= subsAlloc;

  const billsAlloc = rentAlloc + subsAlloc;

  // Step 2: Committed Savings Goals ($600 Total Cap)
  // Emergency Buffer: $300 (Priority Goal - Full Top-Up First)
  // Holiday Goal: $150 & Car Reserve: $150 (Parallel Top-Up - 50/50 split of remaining goal funds)
  const emergencyTarget = 300;
  const holidayTarget = 150;
  const carTarget = 150;
  const committedGoalsTarget = emergencyTarget + holidayTarget + carTarget; // $600

  const emergencyAlloc = Math.min(emergencyTarget, rem);
  rem -= emergencyAlloc;

  const parallelPoolTarget = holidayTarget + carTarget; // $300
  const availForParallel = Math.min(parallelPoolTarget, rem);
  const holidayAlloc = Math.min(holidayTarget, availForParallel / 2);
  const carAlloc = Math.min(carTarget, availForParallel / 2);
  rem -= (holidayAlloc + carAlloc);

  const committedGoalsAlloc = emergencyAlloc + holidayAlloc + carAlloc;

  // Step 3: Everyday Discretionary Allowance ($600 Total Cap)
  // Groceries: $400, Personal: $200 (proportional filling)
  const everydayTargetCap = 600;
  const everydayAlloc = Math.min(everydayTargetCap, rem);
  const groceriesAlloc = Math.min(400, (everydayAlloc * 400) / 600);
  const personalAlloc = Math.min(200, (everydayAlloc * 200) / 600);
  rem -= everydayAlloc;

  // Step 4: Surplus Sweep & Offset Reserve
  const surplusSweepAlloc = Math.max(0, rem);

  return (
    <section id="simulator" className="bg-white border-y border-[#e2e4e0] py-20">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-start">
        {/* Left Column: Interactive Controls */}
        <div className="md:col-span-5 flex flex-col gap-6 sticky top-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase w-fit">
            Interactive Waterfall Demo
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.simulatorTitle")}
          </h2>
          <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
            {t("landing.simulatorDescription")}
          </p>

          {/* Slider Box */}
          <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-[#e2e4e0] flex flex-col gap-5 shadow-sm">
            <div className="flex justify-between items-baseline font-bold text-sm">
              <label htmlFor={sliderId} className="text-[#1B2B4B]">
                {t("landing.simulatedPaycheck")}
              </label>
              <span className="text-[#2563eb] text-2xl font-mono tracking-tight font-extrabold">
                ${paycheckAmount.toLocaleString()} <span className="text-xs font-normal text-zinc-500">AUD</span>
              </span>
            </div>
            <input
              id={sliderId}
              type="range"
              min="0"
              max="5000"
              step="100"
              value={paycheckAmount}
              onChange={(e) => setPaycheckAmount(Number(e.target.value))}
              className="w-full accent-[#2563eb] cursor-pointer h-2.5 bg-zinc-200 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>$0</span>
              <span>$2,500</span>
              <span>$5,000</span>
            </div>
          </div>

          {/* Feature Highlight Callout */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 flex flex-col gap-1.5 text-xs text-blue-900">
            <div className="font-bold flex items-center gap-1.5">
              Smart Allocation Logic
            </div>
            <p className="text-blue-700 leading-snug">
              Notice how <strong>Rent</strong> fills 100% first before <strong>Utilities</strong> start. High-priority <strong>Emergency Buffer</strong> completes fully before lower-priority goals fund in <strong>parallel</strong>!
            </p>
          </div>
        </div>

        {/* Right Column: Live 5-Step Waterfall Breakdown Cards */}
        <div className="md:col-span-7 bg-[#F7F8FA] p-6 md:p-8 rounded-2xl border border-[#e2e4e0] shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-[#e2e4e0] pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("landing.realTimeRecs")}
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              Auto-Cascading Waterfall
            </span>
          </div>

          {/* STEP 1: BILLS POOL (Sequential Top-Up) */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-extrabold text-[#1B2B4B] text-sm block">
                  {t("landing.waterfallStep1")}
                </span>
                <span className="text-[11px] text-zinc-400">Sequential Fill: Priority 1 first</span>
              </div>
              <span className={`${billsAlloc >= billsTargetCap ? "text-[#22c55e]" : "text-amber-600"} font-mono font-bold text-sm`}>
                ${billsAlloc.toFixed(0)} / ${billsTargetCap.toLocaleString()}
              </span>
            </div>
            
            {/* Total Step Progress Bar */}
            <div className="w-full bg-[#F7F8FA] h-2.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-[#2563eb] h-full rounded-full transition-all duration-300"
                style={{ width: `${(billsAlloc / billsTargetCap) * 100}%` }}
              />
            </div>

            {/* Sub-categories Breakdown */}
            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2.5">
              {/* Rent & Mortgage Sub-category */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    {t("landing.billsRent")}
                    <span className="text-[10px] bg-blue-100 text-[#2563eb] px-1.5 py-0.5 rounded font-bold">
                      {t("landing.fullTopupBadge")}
                    </span>
                  </span>
                  <span className="font-mono font-medium">
                    ${rentAlloc.toFixed(0)} / ${rentTarget}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2563eb] h-full rounded-full transition-all duration-300"
                    style={{ width: `${(rentAlloc / rentTarget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Power & Subscriptions Sub-category */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    {t("landing.billsSubs")}
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium">
                      Sequential 2
                    </span>
                  </span>
                  <span className="font-mono font-medium">
                    ${subsAlloc.toFixed(0)} / ${subsTarget}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(subsAlloc / subsTarget) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: COMMITTED SAVINGS GOALS (Sequential Priority + Parallel Top-Up) */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-extrabold text-[#1B2B4B] text-sm block">
                  {t("landing.waterfallStep2")}
                </span>
                <span className="text-[11px] text-zinc-400">Full top-up on Emergency, then parallel on Goals</span>
              </div>
              <span className={`${committedGoalsAlloc >= committedGoalsTarget ? "text-[#22c55e]" : "text-amber-600"} font-mono font-bold text-sm`}>
                ${committedGoalsAlloc.toFixed(0)} / ${committedGoalsTarget.toLocaleString()}
              </span>
            </div>

            {/* Total Step Progress Bar */}
            <div className="w-full bg-[#F7F8FA] h-2.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(committedGoalsAlloc / committedGoalsTarget) * 100}%` }}
              />
            </div>

            {/* Sub-categories Breakdown for GOALS */}
            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2.5">
              {/* Emergency Buffer (Priority Goal: Full Top-Up) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    {t("landing.goalEmergency")}
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                      {t("landing.fullTopupBadge")}
                    </span>
                  </span>
                  <span className="font-mono font-medium">
                    ${emergencyAlloc.toFixed(0)} / ${emergencyTarget}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(emergencyAlloc / emergencyTarget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Holiday Goal (Parallel Top-Up) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    {t("landing.goalHoliday")}
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                      {t("landing.parallelTopupBadge")}
                    </span>
                  </span>
                  <span className="font-mono font-medium">
                    ${holidayAlloc.toFixed(0)} / ${holidayTarget}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(holidayAlloc / holidayTarget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Car Reserve Goal (Parallel Top-Up) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-zinc-700">
                  <span className="font-semibold flex items-center gap-1.5">
                    {t("landing.goalCar")}
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                      {t("landing.parallelTopupBadge")}
                    </span>
                  </span>
                  <span className="font-mono font-medium">
                    ${carAlloc.toFixed(0)} / ${carTarget}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(carAlloc / carTarget) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: EVERYDAY DISCRETIONARY TOP-UP */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-extrabold text-[#1B2B4B] text-sm block">
                  {t("landing.waterfallStep3")}
                </span>
                <span className="text-[11px] text-zinc-400">Safe-to-spend debit allowance</span>
              </div>
              <span className="text-[#2563eb] font-mono font-bold text-sm">
                ${everydayAlloc.toFixed(0)} / ${everydayTargetCap.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full bg-[#F7F8FA] h-2.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-[#22c55e] h-full rounded-full transition-all duration-300"
                style={{ width: `${(everydayAlloc / everydayTargetCap) * 100}%` }}
              />
            </div>

            <div className="pt-2 border-t border-zinc-100 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F7F8FA] p-2.5 rounded-lg border border-zinc-100 flex flex-col">
                <span className="text-zinc-500 font-medium">{t("landing.everydayGroceries")}</span>
                <span className="font-mono font-bold text-[#1B2B4B]">
                  ${groceriesAlloc.toFixed(0)} / $400
                </span>
              </div>
              <div className="bg-[#F7F8FA] p-2.5 rounded-lg border border-zinc-100 flex flex-col">
                <span className="text-zinc-500 font-medium">{t("landing.everydayPersonal")}</span>
                <span className="font-mono font-bold text-[#1B2B4B]">
                  ${personalAlloc.toFixed(0)} / $200
                </span>
              </div>
            </div>
          </div>

          {/* STEP 4: SURPLUS SWEEP & OFFSET RESERVE */}
          <div className="bg-white p-5 rounded-xl border border-[#e2e4e0] shadow-2xs flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-extrabold text-[#1B2B4B] text-sm block">
                  {t("landing.waterfallStep4")}
                </span>
                <span className="text-[11px] text-zinc-400">100% of residual income automatically swept</span>
              </div>
              <span className="text-emerald-700 font-mono font-extrabold text-base">
                +${surplusSweepAlloc.toFixed(0)}
              </span>
            </div>
            
            <div className="w-full bg-[#F7F8FA] h-2.5 rounded-full overflow-hidden border border-zinc-100">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (surplusSweepAlloc / 1500) * 100)}%` }}
              />
            </div>
            
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center justify-between">
              <span>{t("landing.surplusOffset")}</span>
              <span className="font-mono font-bold">${surplusSweepAlloc.toFixed(0)}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};



