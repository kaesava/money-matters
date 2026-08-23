"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function ProblemSection() {
  return (
    <section className="bg-white border-y border-[#e2e4e0] py-20" aria-label="Why Traditional Budgeting Fails">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-14">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider">
            {t("landing.problemSectionBadge")}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.problemSectionTitle")}
          </h2>
          <p className="text-zinc-600 text-base leading-relaxed">
            {t("landing.problemSectionSubtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 flex flex-col gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-xl">
              ☕
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.problem1Title")}</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.problem1Body")}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 flex flex-col gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xl">
              📊
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.problem2Title")}</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.problem2Body")}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-zinc-200 flex flex-col gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-[#2563eb] flex items-center justify-center font-bold text-xl">
              😰
            </div>
            <h3 className="text-lg font-bold text-[#1B2B4B]">{t("landing.problem3Title")}</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">{t("landing.problem3Body")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
