"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function HowItWorksSection() {
  const steps = [
    {
      badge: t("landing.step1Badge", { defaultValue: "STEP 01" }),
      title: t("landing.howStep1Title"),
      body: t("landing.howStep1Body"),
      accent: "text-[#2563eb] bg-blue-50 border-blue-100",
      pill: "border-blue-200",
    },
    {
      badge: t("landing.step2Badge", { defaultValue: "STEP 02" }),
      title: t("landing.howStep2Title"),
      body: t("landing.howStep2Body"),
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      pill: "border-indigo-200",
    },
    {
      badge: t("landing.step3Badge", { defaultValue: "STEP 03" }),
      title: t("landing.howStep3Title"),
      body: t("landing.howStep3Body"),
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
      pill: "border-emerald-200",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12 scroll-mt-14"
      aria-label="How It Works"
    >
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
          {t("landing.howItWorksBadge")}
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("landing.howItWorksTitle")}
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="p-7 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-4 relative"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-mono font-black px-3 py-1 rounded-full border ${step.accent}`}
              >
                {step.badge}
              </span>
              <span className="text-2xl font-black text-slate-200 font-mono">
                0{idx + 1}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#1B2B4B]">{step.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
