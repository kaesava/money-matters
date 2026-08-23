"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface LandingFooterProps {
  onAuthClick: (path: string) => void;
}

export function LandingFooter({ onAuthClick }: LandingFooterProps) {
  return (
    <>
      {/* Conversion Banner */}
      <section className="bg-[#1B2B4B] text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("landing.conversionTitle")}
          </h2>
          <p className="text-zinc-300 text-sm md:text-base max-w-xl leading-relaxed">
            {t("landing.conversionDesc")}
          </p>
          <button
            type="button"
            onClick={() => onAuthClick("/sign-up")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md text-base mt-2 cursor-pointer"
          >
            {t("landing.heroCtaPrimary")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">
            {t("landing.copyright", { appName: t("app.title") })} • Contact: <a href="mailto:info@moneymatters.kaesava.au" className="text-[#2563eb] hover:underline">info@moneymatters.kaesava.au</a>
          </span>
          <div className="flex gap-4 font-semibold">
            <a href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.privacyPolicy")}</a>
            <a href="/terms" className="hover:underline text-[#2563eb]">{t("landing.termsOfService")}</a>
            <a href="mailto:info@moneymatters.kaesava.au" className="hover:underline text-[#2563eb]">Support (info@moneymatters.kaesava.au)</a>
          </div>
        </div>
      </footer>
    </>
  );
}
