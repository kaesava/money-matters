"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export function FaqSection() {
  return (
    <section className="py-20 bg-white border-t border-[#e2e4e0]" aria-label="Frequently Asked Questions">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": t("landing.faq1Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq1Body"),
                },
              },
              {
                "@type": "Question",
                "name": t("landing.faq2Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq2Body"),
                },
              },
              {
                "@type": "Question",
                "name": t("landing.faq3Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq3Body"),
                },
              },
              {
                "@type": "Question",
                "name": t("landing.faq4Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq4Body"),
                },
              },
              {
                "@type": "Question",
                "name": t("landing.faq5Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq5Body"),
                },
              },
              {
                "@type": "Question",
                "name": t("landing.faq6Title"),
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": t("landing.faq6Body"),
                },
              },
            ],
          }),
        }}
      />

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[#2563eb] text-xs font-extrabold uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            {t("landing.faqSectionBadge")}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("landing.faqSectionTitle")}
          </h2>
          <p className="text-sm text-zinc-600 max-w-xl mx-auto">
            {t("landing.faqSectionSubtitle")}
          </p>
        </div>

        <div className="space-y-4">
          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq1Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq1Body")}
            </p>
          </details>

          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq2Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq2Body")}
            </p>
          </details>

          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq3Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq3Body")}
            </p>
          </details>

          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq4Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq4Body")}
            </p>
          </details>

          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq5Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq5Body")}
            </p>
          </details>

          <details className="group bg-[#F7F8FA] p-6 rounded-2xl border border-zinc-200 shadow-2xs transition-all [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between font-bold text-[#1B2B4B] cursor-pointer text-base">
              <span>{t("landing.faq6Title")}</span>
              <span className="text-[#2563eb] group-open:rotate-180 transition-transform font-mono font-black text-lg">
                ↓
              </span>
            </summary>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              {t("landing.faq6Body")}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
