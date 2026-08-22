import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AccountDeletionSection } from "./AccountDeletionSection";

import { Logo } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export const metadata: Metadata = {
  title: "Delete Your Account & Data | Money Matters",
  description:
    "Request deletion of your Money Matters account and all associated financial data. Understand what data is deleted, what is retained, and how to contact us.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#ba1a1a] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[#1B2B4B]">
            <Logo size="sm" /> Money Matters
          </Link>
          <Link href="/privacy" className="text-sm font-semibold text-[#2563eb] hover:underline">
            ← Privacy Policy
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title block */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-full mb-3">
            <span>⚠️</span> ACCOUNT & DATA DELETION REQUEST
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            Delete Your Account & Data
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Money Matters by Kaesava · Effective under the Australian Privacy Act 1988 (Cth)
          </p>
        </div>

        {/* Self-service authenticated deletion section */}
        <AccountDeletionSection />

        {/* Who is this for */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-[#1B2B4B]">{t("privacy.aboutThisPage")}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            This page is for users of the <strong>Money Matters</strong> household budgeting app
            (published on Google Play by Kaesava). You can use the steps below to request complete
            deletion of your account and all personal financial data held by Kaesava. Requests are
            handled manually by our team and fulfilled within <strong>30 calendar days</strong>.
          </p>
        </div>

        {/* Steps */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1B2B4B]">How to Request Account Deletion</h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep1Title")}</h3>
                <p className="text-sm text-slate-600">
                  {t("privacy.deleteStep1Body")}{" "}
                  <a
                    href="mailto:info@moneymatters.kaesava.au?subject=Account%20Deletion%20Request%20%E2%80%94%20Money%20Matters&body=Hi%2C%0A%0AI%20would%20like%20to%20request%20the%20deletion%20of%20my%20Money%20Matters%20account%20and%20all%20associated%20data.%0A%0AEmail%20address%20registered%3A%20%5Byour%20email%5D%0AReason%20(optional)%3A%20%5Byour%20reason%5D%0A%0AThank%20you."
                    className="font-semibold text-[#2563eb] hover:underline"
                  >
                    info@moneymatters.kaesava.au
                  </a>{" "}
                  using the subject line{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
                    Account Deletion Request — Money Matters
                  </code>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep2Title")}</h3>
                <p className="text-sm text-slate-600">
                  {t("privacy.deleteStep2Body")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep3Title")}</h3>
                <p className="text-sm text-slate-600">
                  {t("privacy.deleteStep3Body")}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2563eb] text-white font-extrabold flex items-center justify-center text-lg">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B2B4B]">{t("privacy.deleteStep4Title")}</h3>
                <p className="text-sm text-slate-600">
                  {t("privacy.deleteStep4Body")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1B2B4B]">{t("privacy.whatGetsDeleted")}</h2>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <ul className="space-y-3 text-sm text-slate-700">
              {[t("privacy.delItem1"), t("privacy.delItem2"), t("privacy.delItem3"), t("privacy.delItem4"), t("privacy.delItem5"), t("privacy.delItem6"), t("privacy.delItem7"), t("privacy.delItem8")].map((item) => (
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
          <h2 className="text-2xl font-bold text-[#1B2B4B]">{t("privacy.whatMayBeRetained")}</h2>
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm space-y-3">
            <p className="text-sm text-amber-800 font-medium">
              {t("privacy.whatMayBeRetainedSub")}
            </p>
            <ul className="space-y-3 text-sm text-amber-900">
              {[{item: t("privacy.retainItem1"), note: t("privacy.retainNote1")}, {item: t("privacy.retainItem2"), note: t("privacy.retainNote2")}, {item: t("privacy.retainItem3"), note: t("privacy.retainNote3")}].map(({ item, note }) => (
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
        <section className="p-6 bg-[#1B2B4B] text-white rounded-2xl shadow-md space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.privacyContact")}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t("privacy.privacyContactSub")}
          </p>
          <div className="space-y-1 text-sm">
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
              <strong>{t("privacy.devLabel")}</strong> Kaesava, Australia
            </div>
            <div>
              <strong>{t("privacy.appLabel")}</strong> Money Matters — Household Budget Manager
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400 text-center">
          {t("privacy.googlePlayNotice")}
          &nbsp;·&nbsp;
          <Link href="/privacy" className="underline hover:text-slate-600">
            Full Privacy Policy
          </Link>
        </p>
      </main>
    </div>
  );
}
