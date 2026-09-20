"use client";
export const dynamic = 'force-dynamic';

import React from "react";
import { t } from "@money-matters/i18n";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10 flex-1 w-full">
        {/* Page Title & Compliance Badge */}
        <div>
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
            {t("terms.complianceBadge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("terms.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            {t("terms.lastUpdated")}
          </p>
        </div>

        {/* Prominent Statutory Financial Disclaimer Callout */}
        <div className="p-6 bg-amber-50/80 border border-amber-200/90 rounded-3xl shadow-xs space-y-3">
          <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
            <span>⚖️</span> {t("terms.disclaimerBoxTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
            {t("terms.disclaimerBoxBody")}
          </p>
        </div>

        {/* Detailed Sections */}
        <section className="space-y-8 text-sm leading-relaxed text-slate-700 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section1Title")}</h2>
            <p>{t("terms.section1Body")}</p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section2Title")}</h2>
            <p>{t("terms.section2Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("terms.section2Item1")}</li>
              <li>{t("terms.section2Item2")}</li>
              <li>{t("terms.section2Item3")}</li>
              <li>{t("terms.section2Item4")}</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section3Title")}</h2>
            <p>{t("terms.section3Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("terms.section3Item1")}</li>
              <li>{t("terms.section3Item2")}</li>
              <li>{t("terms.section3Item3")}</li>
              <li>{t("terms.section3Item4")}</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section4Title")}</h2>
            <p>{t("terms.section4Body")}</p>
          </div>

          {/* Section 5 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section5Title")}</h2>
            <p>{t("terms.section5Body")}</p>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section6Title")}</h2>
            <p>{t("terms.section6Body")}</p>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section7Title")}</h2>
            <p>{t("terms.section7Body")}</p>
          </div>

          {/* Section 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section8Title")}</h2>
            <p>{t("terms.section8Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("terms.section8Item1")}</li>
              <li>{t("terms.section8Item2")}</li>
              <li>{t("terms.section8Item3")}</li>
              <li>{t("terms.section8Item4")}</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section9Title")}</h2>
            <p>{t("terms.section9Body")}</p>
          </div>

          {/* Section 10 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section10Title")}</h2>
            <p>{t("terms.section10Body")}</p>
          </div>

          {/* Section 11 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section11Title")}</h2>
            <p>{t("terms.section11Body")}</p>
          </div>

          {/* Section 12 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section12Title")}</h2>
            <p>{t("terms.section12Body")}</p>
          </div>

          {/* Section 13 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section13Title")}</h2>
            <p>{t("terms.section13Body")}</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-[#2563eb] font-bold">
              {t("terms.section13Email")}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
