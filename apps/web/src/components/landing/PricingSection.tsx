"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface PricingSectionProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function PricingSection({ onAuthClick }: PricingSectionProps) {
  return (
    <section id="pricing" className="bg-slate-100/70 border-t border-slate-200/80 py-20 scroll-mt-14" aria-label="Pricing">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-10">
        <div className="text-center max-w-xl space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.pricingTitle")}
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {t("landing.pricingSubtitle")}
          </p>
        </div>

        <div className="w-full max-w-xl">
          <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-[#2563eb] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
              {t("landing.pricingFullAccessBadge", { defaultValue: "FULL ACCESS" })}
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-[#2563eb]">
                  {t("landing.pricingHouseholdTitle")}
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] w-fit mt-1">
                  {t("landing.pricingTrialBadge")}
                </div>
              </div>

              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-4xl sm:text-5xl font-black text-[#1B2B4B]">
                  {t("landing.pricingHouseholdPrice")}
                </span>
                <span className="text-xs font-sans text-slate-500 font-semibold">
                  {t("landing.pricingHouseholdSub")}
                </span>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-950 font-bold">
                {t("landing.pricingFoundingBadge")}
              </div>

              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-slate-700 font-semibold mt-1">
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature1")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature2")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature3")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature4")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature5")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#2563eb] font-black">✓</span>
                  <span>{t("landing.pricingHouseholdFeature6")}</span>
                </li>
              </ul>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  🛡️ {t("landing.pricingDataSovereigntyBadge")}
                </div>
                <p className="leading-relaxed text-emerald-900 font-medium">
                  {t("landing.pricingDataSovereigntyNote")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAuthClick("signUp")}
              className="w-full mt-6 bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg text-sm transition-all active:scale-98 cursor-pointer"
            >
              {t("landing.createAccount")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
