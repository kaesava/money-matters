"use client";

import React from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";

export interface LandingHeaderProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

export function LandingHeader({ onAuthClick }: LandingHeaderProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-2xs">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size="md" />
          <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors">
            {t("app.title")}
          </span>
        </Link>

        {/* Navigation Anchors for desktop */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <a href="#why-us" className="hover:text-[#2563eb] transition-colors">
            {t("landing.problemSectionBadge")}
          </a>
          <a href="#how-it-works" className="hover:text-[#2563eb] transition-colors">
            {t("landing.howItWorksBadge")}
          </a>
          <a href="#advantages" className="hover:text-[#2563eb] transition-colors">
            {t("landing.advantagesSectionBadge")}
          </a>
          <a href="#pricing" className="hover:text-[#2563eb] transition-colors">
            {t("landing.pricingTitle")}
          </a>
          <a href="#faq" className="hover:text-[#2563eb] transition-colors">
            {t("landing.faqSectionBadge")}
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onAuthClick("signIn")}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#1B2B4B] bg-slate-100 hover:bg-slate-200/90 border border-slate-200/90 px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            {t("auth.signIn")}
          </button>
          <button
            type="button"
            onClick={() => onAuthClick("signUp")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold px-4.5 py-2 rounded-xl transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer"
          >
            {t("landing.createAccount")}
          </button>
        </div>
      </div>
    </header>
  );
}
