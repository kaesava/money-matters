"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 text-xs text-slate-500 font-sans">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <span className="font-semibold text-slate-700">
            © {currentYear} {t("app.title")}
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500">
            {t("app.tagline")}
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-5 font-medium">
          <Link href="/" className="hover:text-[#2563eb] transition-colors">
            {t("nav.home")}
          </Link>
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
  );
}
