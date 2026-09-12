"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";

export interface LandingFooterProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function LandingFooter({ onAuthClick }: LandingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Conversion Banner */}
      <section className="bg-[#1B2B4B] text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-5">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            {t("landing.conversionTitle")}
          </h2>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed">
            {t("landing.conversionDesc")}
          </p>
          <button
            type="button"
            onClick={() => onAuthClick("signUp")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg text-sm mt-2 cursor-pointer active:scale-98"
          >
            {t("landing.createAccount")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#F7F8FA] py-8 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-semibold text-slate-700">
              © {currentYear} {t("app.title")}
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-slate-500">
              {t("app.tagline")}
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 font-medium">
            <Link href="/terms" className="hover:text-[#2563eb] transition-colors">
              {t("landing.footerTerms")}
            </Link>
            <Link href="/privacy" className="hover:text-[#2563eb] transition-colors">
              {t("landing.footerPrivacy")}
            </Link>
            <Link href="/privacy/delete-account" className="hover:text-[#2563eb] transition-colors">
              {t("privacy.deletePageTitle")}
            </Link>
            <Link href="/blog" className="hover:text-[#2563eb] transition-colors">
              {t("landing.footerBlog")}
            </Link>
            <a
              href="mailto:info@moneymatters.kaesava.au"
              className="text-[#2563eb] hover:underline"
            >
              info@moneymatters.kaesava.au
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
