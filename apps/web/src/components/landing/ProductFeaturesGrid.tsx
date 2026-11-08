"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { CalendarRange, Users, Sparkles, CheckCircle2 } from "lucide-react";

export function ProductFeaturesGrid() {
  return (
    <section
      id="features"
      className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-14 scroll-mt-14"
      aria-label="Flagship Capabilities"
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider shadow-2xs">
          {t("landing.featuresBadge")}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
          {t("landing.featuresTitle")}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
          {t("landing.featuresSubtitle")}
        </p>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid md:grid-cols-3 gap-7">
        {/* Pillar 1: Forward Planning & 12-Month Projections */}
        <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold font-mono text-[#2563eb] bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/60 uppercase">
                {t("landing.pillar1Badge")}
              </span>
              <h3 className="text-lg font-black text-[#1B2B4B] leading-snug">
                {t("landing.pillar1Title")}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed font-normal">
                {t("landing.pillar1Body")}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] font-mono font-bold text-slate-600 space-y-1.5">
            <div className="text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t("landing.pillar1Step1")}</span>
            </div>
            <div className="text-[#2563eb] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t("landing.pillar1Step2")}</span>
            </div>
            <div className="text-indigo-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t("landing.pillar1Step3")}</span>
            </div>
            <div className="text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t("landing.pillar1Step4")}</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Stealth Privacy for Households */}
        <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold font-mono text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-200/60 uppercase">
                {t("landing.pillar2Badge")}
              </span>
              <h3 className="text-lg font-black text-[#1B2B4B] leading-snug">
                {t("landing.pillar2Title")}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed font-normal">
                {t("landing.pillar2Body")}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60">
              <span>{t("landing.pillar2SharedLabel")}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                {t("landing.pillar2VisibleBadge")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white p-2 rounded-xl border border-slate-200/60">
              <span>{t("landing.pillar2PrivateLabel")}</span>
              <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-mono">
                {t("landing.pillar2StealthBadge")}
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 text-center pt-0.5">
              {t("landing.pillar2SubNote")}
            </p>
          </div>
        </div>

        {/* Pillar 3: 5-Level Affordability Engine */}
        <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6 group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#22c55e] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold font-mono text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/60 uppercase">
                {t("landing.pillar3Badge")}
              </span>
              <h3 className="text-lg font-black text-[#1B2B4B] leading-snug">
                {t("landing.pillar3Title")}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed font-normal">
                {t("landing.pillar3Body")}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-[11px] font-mono font-bold">
            <div className="text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              🟢 SAFE YES — bills stay 100% protected
            </div>
            <div className="text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60">
              🟡 PACING WARNING — everyday buffer tight
            </div>
            <div className="text-orange-700 bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200/60">
              🟠 IMPACTS GOAL — borrows savings pacing
            </div>
            <div className="text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60">
              🔵 WAIT FOR PAYDAY — pay covers in 6 days
            </div>
            <div className="text-[#ba1a1a] bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-200/60">
              🔴 HARD NO — deficit risk detected
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
