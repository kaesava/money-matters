"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../providers/LocaleProvider";
import { ShieldCheck, Target, ShoppingBag, Sparkles, Lock } from "lucide-react";

export function PaydayCockpitPreview() {
  const { currencySymbol } = useLocale();
  const [mode, setMode] = useState<"single" | "dual">("dual");

  // Dynamic values based on earner mode
  const isDual = mode === "dual";
  const totalPay = isDual ? "5,200.00" : "2,600.00";
  const billsAmount = isDual ? "2,640.00" : "1,320.00";
  const goalsAmount = isDual ? "960.00" : "480.00";
  const everydayAmount = isDual ? "1,300.00" : "650.00";
  const offsetAmount = isDual ? "300.00" : "150.00";

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden text-left transition-all">
      {/* Mock Browser Title Bar */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-500 shadow-2xs">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>{t("landing.cockpitDomain")}</span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t("landing.cockpitStatus")}</span>
        </div>
      </div>

      {/* Main Cockpit Display */}
      <div className="p-6 sm:p-8 flex flex-col gap-6 bg-gradient-to-b from-white to-slate-50/40">
        {/* Cockpit Header Strip */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2563eb]">
                {t("landing.heroForwardAllocation")}
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {t("landing.cockpitNextPay", { currencySymbol, amount: totalPay })}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#1B2B4B] tracking-tight mt-1 flex items-baseline gap-2">
              <span className="font-mono text-[#2563eb]">{currencySymbol}{totalPay}</span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {t("landing.cockpitAllocated")}
              </span>
            </div>
          </div>

          {/* Interactive Earner Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                mode === "single"
                  ? "bg-white text-[#1B2B4B] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.cockpitSingleEarner")}
            </button>
            <button
              type="button"
              onClick={() => setMode("dual")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                mode === "dual"
                  ? "bg-[#2563eb] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.cockpitDualEarner")}
            </button>
          </div>
        </div>

        {/* Visual Allocation Waterfall Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="bg-[#2563eb] h-full w-[51%] transition-all duration-500" title="Bills" />
            <div className="bg-indigo-500 h-full w-[18%] transition-all duration-500" title="Goals" />
            <div className="bg-[#22c55e] h-full w-[25%] transition-all duration-500" title="Everyday" />
            <div className="bg-emerald-300 h-full w-[6%] transition-all duration-500" title="Offset" />
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-500 font-mono pt-1">
            <span className="text-[#2563eb]">■ Bills (51%)</span>
            <span className="text-indigo-600">■ Goals (18%)</span>
            <span className="text-[#22c55e]">■ Everyday (25%)</span>
            <span className="text-emerald-700">■ Offset Sweep (6%)</span>
          </div>
        </div>

        {/* Cockpit 4-Card Allocation Matrix */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Bills Ring-Fenced */}
          <div className="p-4 rounded-2xl bg-white border border-blue-200/90 shadow-2xs flex flex-col justify-between gap-3 group hover:border-[#2563eb] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full font-mono">
                {t("landing.heroProtected")}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#1B2B4B]">{t("landing.cockpitBillsLabel")}</div>
              <div className="text-2xl font-black font-mono text-[#2563eb] mt-0.5 tabular-nums">
                {currencySymbol}{billsAmount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                {t("landing.cockpitBillsDesc")}
              </p>
            </div>
          </div>

          {/* Card 2: Committed Goals */}
          <div className="p-4 rounded-2xl bg-white border border-indigo-200/90 shadow-2xs flex flex-col justify-between gap-3 group hover:border-indigo-400 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full font-mono">
                {t("landing.heroOnTrack")}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#1B2B4B]">{t("landing.cockpitGoalsLabel")}</div>
              <div className="text-2xl font-black font-mono text-indigo-700 mt-0.5 tabular-nums">
                {currencySymbol}{goalsAmount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                {t("landing.cockpitGoalsDesc")}
              </p>
            </div>
          </div>

          {/* Card 3: Everyday Safe-to-Spend */}
          <div className="p-4 rounded-2xl bg-white border-2 border-[#22c55e] shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#22c55e] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                {t("landing.cockpitSafeToSpendBadge")}
              </span>
            </div>
            <div>
              <div className="text-xs font-black text-[#1B2B4B]">{t("landing.cockpitEverydayLabel")}</div>
              <div className="text-2xl font-black font-mono text-[#22c55e] mt-0.5 tabular-nums">
                {currencySymbol}{everydayAmount}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">
                {t("landing.cockpitEverydayDesc")}
              </p>
            </div>
          </div>

          {/* Card 4: Mortgage Offset Sweep */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3 group hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                {t("landing.cockpitOffsetSweepBadge")}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#1B2B4B]">{t("landing.cockpitOffsetLabel")}</div>
              <div className="text-2xl font-black font-mono text-slate-800 mt-0.5 tabular-nums">
                +{currencySymbol}{offsetAmount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                {t("landing.cockpitOffsetDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
