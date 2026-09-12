"use client";

import React from "react";
import Link from "next/link";
import { AccountDeletionSection } from "./AccountDeletionSection";
import { PublicHeader } from "../../../components/public/PublicHeader";
import { PublicFooter } from "../../../components/public/PublicFooter";
import { t } from "@money-matters/i18n";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#ba1a1a] selection:text-white flex flex-col justify-between">
      <PublicHeader backHref="/privacy" backLabel="← Privacy Policy" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10 flex-1 w-full">
        {/* Title block */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-full mb-3">
            <span>⚠️</span> {t("privacy.deleteRequestBadge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("privacy.deletePageTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            {t("app.title")} · {t("privacy.legalNotice")}
          </p>
        </div>

        {/* Tab Notice for users coming from Settings */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-[#1B2B4B] flex items-center justify-between gap-4 font-medium">
          <span>ℹ️ {t("privacy.closeTabNotice")}</span>
        </div>

        {/* Self-service authenticated deletion section */}
        <AccountDeletionSection />

        {/* Who is this for */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-[#1B2B4B]">{t("privacy.aboutThisPage")}</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t("privacy.webAndMobileNotice")} {t("privacy.deletePageSubtitle")}
          </p>
        </div>

        {/* Steps */}
        <section className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B2B4B]">
            {t("privacy.howToRequestTitle")}
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep1Title")}</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  {t("privacy.emailInstructions")}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep2Title")}</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  {t("privacy.deleteStep2Body")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep3Title")}</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  {t("privacy.deleteStep3Body")}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep4Title")}</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  {t("privacy.deleteStep4Body")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B2B4B]">{t("privacy.whatGetsDeleted")}</h2>
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs">
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
              {[
                t("privacy.delItem1"),
                t("privacy.delItem2"),
                t("privacy.delItem3"),
                t("privacy.delItem4"),
                t("privacy.delItem5"),
                t("privacy.delItem6"),
                t("privacy.delItem7"),
                t("privacy.delItem8"),
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#ba1a1a] font-bold mt-0.5 flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What is retained */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B2B4B]">{t("privacy.whatMayBeRetained")}</h2>
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl shadow-xs space-y-3">
            <p className="text-xs sm:text-sm text-amber-800 font-medium">
              {t("privacy.whatMayBeRetainedSub")}
            </p>
            <ul className="space-y-3 text-xs sm:text-sm text-amber-900">
              {[
                { item: t("privacy.retainItem1"), note: t("privacy.retainNote1") },
                { item: t("privacy.retainItem2"), note: t("privacy.retainNote2") },
                { item: t("privacy.retainItem3"), note: t("privacy.retainNote3") },
              ].map(({ item, note }) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">⚠</span>
                  <span>
                    <strong>{item}:</strong> {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact section */}
        <section className="p-6 bg-[#1B2B4B] text-white rounded-3xl shadow-md space-y-3">
          <h2 className="text-lg sm:text-xl font-bold">{t("privacy.privacyContact")}</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t("privacy.privacyContactSub")}
          </p>
          <div className="space-y-1 text-xs sm:text-sm">
            <div>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:info@moneymatters.kaesava.au"
                className="text-[#2563eb] underline hover:text-blue-300"
              >
                info@moneymatters.kaesava.au
              </a>
            </div>
            <div>
              <strong>{t("privacy.devLabel")}</strong> {t("privacy.devInfo")}
            </div>
            <div>
              <strong>{t("privacy.appLabel")}</strong> {t("app.fullTitle")}
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400 text-center">
          {t("privacy.googlePlayNotice")}
          &nbsp;·&nbsp;
          <Link href="/privacy" className="underline hover:text-slate-600">
            {t("landing.privacyPolicy")}
          </Link>
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
