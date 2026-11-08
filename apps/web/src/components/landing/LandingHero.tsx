"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { HeroCtaActions } from "./HeroCtaActions";
import { PaydayCockpitPreview } from "./PaydayCockpitPreview";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export interface LandingHeroProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function LandingHero({ onAuthClick }: LandingHeroProps) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center flex flex-col items-center gap-6" aria-label="Hero">
      {/* Aussie Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
        {t("landing.badge")}
      </div>

      {/* Hero Headline with Tagline */}
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

      {/* Value Reassurance Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs font-bold text-slate-600">
        <div className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
          <span>{t("landing.reassuranceTrial")}</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{t("landing.reassuranceNoCard")}</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t("landing.reassurancePrivacy")}</span>
        </div>
      </div>

      {/* Ultra-Crisp Interactive Cockpit Showcase */}
      <div className="w-full mt-6">
        <PaydayCockpitPreview />
      </div>
    </section>
  );
}
