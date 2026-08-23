"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function HowItWorksSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-14" aria-label="How It Works">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
          {t("landing.howItWorksBadge")}
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("landing.howItWorksTitle")}
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 relative">
        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
          <span className="text-xs font-mono font-bold text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 w-fit">
            STEP 01
          </span>
          <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.howStep1Title")}</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.howStep1Body")}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
          <span className="text-xs font-mono font-bold text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 w-fit">
            STEP 02
          </span>
          <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.howStep2Title")}</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.howStep2Body")}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-sm flex flex-col gap-4">
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 w-fit">
            STEP 03
          </span>
          <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.howStep3Title")}</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.howStep3Body")}</p>
        </div>
      </div>
    </section>
  );
}
