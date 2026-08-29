"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface PricingSectionProps {
  onAuthClick: (path: string) => void;
}

export function PricingSection({ onAuthClick }: PricingSectionProps) {
  return (
    <section className="bg-zinc-100/70 border-t border-[#e2e4e0] py-20" aria-label="Pricing">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-12">
        <div className="text-center max-w-xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B] mb-3">
            {t("landing.pricingTitle")}
          </h2>
          <p className="text-zinc-600 text-sm leading-relaxed">
            {t("landing.pricingSubtitle")}
          </p>
        </div>

        <div className="w-full max-w-xl">
          {/* Single Unified Household Tier */}
          <div className="bg-white rounded-2xl p-8 border-2 border-[#2563eb] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#2563eb] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              {t("landing.pricingFullAccessBadge", { defaultValue: "FULL ACCESS" })}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">
                  {t("landing.pricingHouseholdTitle")}
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] w-fit mt-1">
                  {t("landing.pricingTrialBadge")}
                </div>
              </div>

              <div className="flex items-baseline gap-2 font-mono mt-1">
                <span className="text-4xl font-extrabold text-[#1B2B4B]">
                  {t("landing.pricingHouseholdPrice")}
                </span>
                <span className="text-xs font-sans text-zinc-500">
                  {t("landing.pricingHouseholdSub")}
                </span>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-semibold">
                {t("landing.pricingFoundingBadge")}
              </div>

              <ul className="flex flex-col gap-3 text-sm text-zinc-700 font-medium mt-2">
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature1")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature2")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature3")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature4")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature5")}</li>
                <li className="flex items-center gap-2 text-[#2563eb]">✓ {t("landing.pricingHouseholdFeature6")}</li>
              </ul>

              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  🛡️ {t("landing.pricingDataSovereigntyBadge")}
                </div>
                <p className="leading-relaxed text-emerald-800">
                  {t("landing.pricingDataSovereigntyNote")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAuthClick("/sign-up")}
              className="w-full mt-8 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md text-sm transition-colors cursor-pointer"
              aria-label={t("landing.heroCtaPrimary")}
            >
              {t("landing.heroCtaPrimary")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
