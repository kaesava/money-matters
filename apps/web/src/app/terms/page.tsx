"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10 flex-1 w-full">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("terms.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            {t("terms.lastUpdated")}
          </p>
        </div>

        <section className="space-y-6 text-sm leading-relaxed text-slate-700 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <p>{t("terms.content")}</p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
