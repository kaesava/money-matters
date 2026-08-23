"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { DonutRing } from "../web/DonutRing";

export interface LandingHeroProps {
  onAuthClick: (path: string) => void;
}

export function LandingHero({ onAuthClick }: LandingHeroProps) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center gap-8" aria-label="Hero">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
        {t("landing.badge")}
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold text-[#1B2B4B] tracking-tight max-w-4xl leading-[1.15]">
        {t("landing.heroTitle")} <span className="text-[#2563eb]">{t("landing.heroTitleSpan")}</span>
      </h1>
      <p className="text-lg md:text-xl text-zinc-600 max-w-2xl leading-relaxed">
        {t("landing.heroSubtitle")}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <button
          type="button"
          onClick={() => onAuthClick("/sign-up")}
          className="bg-[#1B2B4B] hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base cursor-pointer"
        >
          {t("landing.heroCtaPrimary")}
        </button>
        <button
          type="button"
          onClick={() => {
            const element = document.getElementById("simulator");
            element?.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-white border border-[#e2e4e0] hover:bg-zinc-50 text-[#1B2B4B] font-semibold px-8 py-4 rounded-xl transition-all text-base shadow-2xs cursor-pointer"
        >
          {t("landing.heroCtaSecondary")}
        </button>
      </div>

      {/* Hero Interactive UI Preview Mock */}
      <div className="w-full max-w-4xl mt-6 rounded-2xl bg-white border border-[#e2e4e0] p-6 shadow-xl text-left grid md:grid-cols-3 gap-6 items-center">
        <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col items-center text-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Everyday Discretionary</span>
          <DonutRing
            size={130}
            strokeWidth={10}
            timeElapsedPct={45}
            consumedPct={32}
            centerLabel="$485.50"
            subLabel="Everyday"
          />
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full w-fit">
            🟢 SAFE YES ($34.60/day)
          </div>
        </div>
        <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2 h-full justify-center">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Unified Bills Pool</span>
          <div className="text-2xl font-extrabold font-mono text-[#2563eb]">$1,840.00</div>
          <div className="text-xs text-zinc-500 font-medium">All upcoming bills fully funded ✓</div>
          <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden mt-1">
            <div className="bg-[#2563eb] h-full w-full rounded-full" />
          </div>
        </div>
        <div className="bg-[#F7F8FA] p-5 rounded-xl border border-zinc-200 flex flex-col gap-2 h-full justify-center">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Surplus Sweep Target</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">$3,250.00</div>
          <div className="text-xs text-zinc-500 font-medium">Offset Reserve growing automatically</div>
          <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-600 h-full w-[78%] rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
