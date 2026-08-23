"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function AdvantagesSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-16" aria-label="Core Financial Engines">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
          {t("landing.advantagesSectionBadge")}
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("landing.advantagesSectionHeading")}
        </h2>
        <p className="text-zinc-600 text-base leading-relaxed">
          {t("landing.advantagesSectionSubheading")}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Advantage 1 */}
        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {t("landing.advantage1Label")}
            </span>
            <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage1Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage1Body")}</p>
          </div>
          <div className="p-4 bg-[#F7F8FA] rounded-xl border border-zinc-200 space-y-2 text-xs text-zinc-600">
            <p>• {t("landing.advantage1Detail1")}</p>
            <p>• {t("landing.advantage1Detail2")}</p>
            <p>• {t("landing.advantage1Detail3")}</p>
            <p>• {t("landing.advantage1Detail4")}</p>
          </div>
        </div>

        {/* Advantage 2 */}
        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {t("landing.advantage2Label")}
            </span>
            <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage2Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage2Body")}</p>
          </div>
          <div className="p-4 bg-[#F7F8FA] rounded-xl border border-zinc-200 space-y-1.5 text-xs font-medium">
            <div className="text-emerald-700">{t("landing.advantage2Verdict1")}</div>
            <div className="text-amber-700">{t("landing.advantage2Verdict2")}</div>
            <div className="text-orange-700">{t("landing.advantage2Verdict3")}</div>
            <div className="text-blue-700">{t("landing.advantage2Verdict4")}</div>
            <div className="text-[#ba1a1a]">{t("landing.advantage2Verdict5")}</div>
          </div>
        </div>

        {/* Advantage 3 */}
        <div className="p-6 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs flex flex-col justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              {t("landing.advantage3Label")}
            </span>
            <h3 className="text-xl font-bold text-[#1B2B4B]">{t("landing.advantage3Title")}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">{t("landing.advantage3Body")}</p>
          </div>
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto">
            <code>{t("landing.advantage3Detail")}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
