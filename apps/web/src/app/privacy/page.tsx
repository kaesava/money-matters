"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      <PublicHeader />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10 flex-1 w-full">
        <div>
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
            {t("privacy.complianceBadge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("privacy.pageTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            {t("privacy.effectiveDate")}
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
          <h3 className="text-base font-bold text-[#1B2B4B]">🔒 {t("privacy.commitmentTitle")}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("privacy.commitmentBody")}
          </p>
        </div>

        <section className="space-y-8 text-sm leading-relaxed text-slate-700 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section1Title")}</h2>
            <p>{t("privacy.section1Body")}</p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section2Title")}</h2>
            <p>{t("privacy.section2Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>{t("privacy.section2Item1")}</li>
              <li>{t("privacy.section2Item2")}</li>
              <li>{t("privacy.section2Item3")}</li>
              <li>{t("privacy.section2Item4")}</li>
              <li>{t("privacy.section2Item5")}</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section3Title")}</h2>
            <p>{t("privacy.section3Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>{t("privacy.section3Item1")}</li>
              <li>{t("privacy.section3Item2")}</li>
              <li>{t("privacy.section3Item3")}</li>
              <li>{t("privacy.section3Item4")}</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section4Title")}</h2>
            <p className="text-slate-600 leading-relaxed">{t("privacy.section4Body")}</p>
          </div>

          {/* Section 5 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section5Title")}</h2>
            <p>{t("privacy.section5Intro")}</p>
            
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-1 font-mono text-xs border border-slate-800">
              <p className="font-bold text-[#2563eb]">{t("privacy.section5StealthTitle")}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{t("privacy.section5StealthBody")}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section5EncryptionTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section5EncryptionBody")}</p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section6Title")}</h2>
            <p>{t("privacy.section6Intro")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-[#1B2B4B] font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColProcessor")}</th>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColPurpose")}</th>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColLocation")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr><td className="p-3 font-semibold text-left">Neon DB</td><td className="p-3 text-left">Primary database host (PostgreSQL serverless with RLS)</td><td className="p-3 text-left">Asia-Pacific (Sydney) / AWS</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Cloudflare Workers / OpenNext</td><td className="p-3 text-left">Edge compute & API execution</td><td className="p-3 text-left">Global Edge Network</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Cloudflare R2</td><td className="p-3 text-left">Receipts & file attachment storage</td><td className="p-3 text-left">Global Edge Network</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Stripe</td><td className="p-3 text-left">Subscription billing & payment processing</td><td className="p-3 text-left">United States</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Resend API</td><td className="p-3 text-left">Transactional emails & partner invites</td><td className="p-3 text-left">United States</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Inngest Cloud</td><td className="p-3 text-left">Scheduled notification workflows & async events</td><td className="p-3 text-left">United States</td></tr>
                  <tr><td className="p-3 font-semibold text-left">PostHog</td><td className="p-3 text-left">Product analytics & session replays (PII redacted)</td><td className="p-3 text-left">United States / EU</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Sentry</td><td className="p-3 text-left">Application performance & error tracking (PII redacted)</td><td className="p-3 text-left">United States</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section7Title")}</h2>
            <p>{t("privacy.section7Body")}</p>
          </div>

          {/* Section 8 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section8Title")}</h2>
            <p>{t("privacy.section8Body")}</p>
          </div>

          {/* Section 9 */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section9Title")}</h2>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9ExportTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section9ExportBody")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9DeletionTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section9DeletionBody")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9RetentionTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section9RetentionBody")}</p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section10Title")}</h2>
            <p>{t("privacy.section10Body")}</p>
          </div>

          {/* Section 11 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section11Title")}</h2>
            <p>{t("privacy.section11Body")}</p>
          </div>

          {/* Section 12 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section12Title")}</h2>
            <p>{t("privacy.section12Body")}</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-[#2563eb] font-bold">
              {t("privacy.section12Email")}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t("privacy.section12OaicNote")}
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
