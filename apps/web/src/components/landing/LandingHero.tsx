"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { HeroCtaActions } from "./HeroCtaActions";

export interface LandingHeroProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function LandingHero({ onAuthClick }: LandingHeroProps) {
  const [testAmount, setTestAmount] = useState<string>("150");
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSimCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(testAmount) || 0;
    if (val <= 200) {
      setTestResult(t("landing.heroBentoSimSafe"));
    } else if (val <= 600) {
      setTestResult(t("landing.heroBentoSimGoalImpact"));
    } else {
      setTestResult(t("landing.heroBentoSimTight"));
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center flex flex-col items-center gap-6" aria-label="Hero">
      {/* Aussie Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
        {t("landing.badge")}
      </div>

      {/* Hero Headline with new Tagline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1B2B4B] tracking-tight max-w-4xl leading-[1.12]">
        {t("landing.heroTitlePart1")}{" "}
        <span className="text-[#2563eb] underline decoration-blue-200 decoration-wavy decoration-2 underline-offset-8">
          {t("landing.heroTitleSpan")}
        </span>
      </h1>

      {/* Hero Subtitle */}
      <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-medium">
        {t("landing.heroSubtitle")}
      </p>

      {/* Primary & Secondary Action CTAs */}
      <HeroCtaActions onAuthClick={onAuthClick} />

      {/* Comparison Split: Before vs After + Live Bento Showcase */}
      <div className="w-full mt-8 grid lg:grid-cols-12 gap-6 text-left items-stretch">
        {/* Left Column: The Old Way (Friction & Anxiety) */}
        <div className="lg:col-span-4 rounded-3xl bg-slate-900 text-white p-6 md:p-7 flex flex-col justify-between shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-extrabold uppercase tracking-wider">
              <span>⚠️</span>
              <span>{t("landing.heroCompareOldLabel")}</span>
            </div>

            <ul className="space-y-3.5 pt-1 text-xs text-slate-300 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>{t("landing.heroCompareOldFriction1")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>{t("landing.heroCompareOldFriction2")}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">✕</span>
                <span>{t("landing.heroCompareOldFriction3")}</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-900/50 space-y-1.5">
            <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
              {t("landing.heroIllusionTitle")}
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {t("landing.heroIllusionBody")}
            </div>
          </div>
        </div>

        {/* Right Column: The Money Matters Way (Live Bento Showcase) */}
        <div className="lg:col-span-8 rounded-3xl bg-white border-2 border-blue-200 p-6 md:p-7 shadow-xl flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold uppercase tracking-wider">
              <span>✓</span>
              <span>{t("landing.heroCompareNewLabel")}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {t("landing.heroForwardAllocation")}
            </span>
          </div>

          {/* Bento Tiles Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Tile 1: Zero Bill Shock Ring-Fence */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#1B2B4B]">
                  🛡️ {t("landing.heroBentoBillsTitle")}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {t("landing.heroProtected")}
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#2563eb]">$1,540.00</div>
              <p className="text-[11px] text-slate-600 font-medium">
                {t("landing.heroBentoBillsDue")}
              </p>
            </div>

            {/* Tile 2: Visible Goal Progress */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#1B2B4B]">
                  📈 {t("landing.heroBentoGoalsTitle")}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {t("landing.heroOnTrack")}
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700">$4,850.00</div>
              <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[68%] rounded-full" />
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {t("landing.heroBentoGoalsSubtitle")}
              </p>
            </div>

            {/* Tile 3: Guilt-Free Everyday Balance */}
            <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-slate-200 space-y-1.5">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {t("landing.heroBentoEverydayTitle")}
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">$485.50</div>
              <p className="text-[11px] text-slate-600 font-medium">
                {t("landing.heroBentoEverydaySubtitle")}
              </p>
            </div>

            {/* Tile 4: Embedded "Can I Afford This?" Instant Tester */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
              <div className="text-xs font-black text-[#1B2B4B] flex items-center justify-between">
                <span>💡 {t("landing.heroBentoSimTitle")}</span>
                <span className="text-[10px] font-bold text-slate-400">{t("landing.heroInstantVerdict")}</span>
              </div>
              <form onSubmit={handleSimCheck} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="150"
                    className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#1B2B4B] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t("landing.heroBentoSimCheck")}
                </button>
              </form>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 truncate">
                {testResult || t("landing.heroBentoSimSafe")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
