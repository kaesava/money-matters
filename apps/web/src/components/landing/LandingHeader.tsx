"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";

export interface LandingHeaderProps {
  onAuthClick: (path: string) => void;
}

export function LandingHeader({ onAuthClick }: LandingHeaderProps) {
  return (
    <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B] hidden sm:inline">
            {t("app.title")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onAuthClick("/sign-in")}
            className="text-sm font-semibold text-zinc-600 hover:text-[#1B2B4B] transition-colors cursor-pointer"
            aria-label={t("auth.signInCta")}
          >
            {t("auth.signInCta")}
          </button>
          <button
            type="button"
            onClick={() => onAuthClick("/sign-up")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            aria-label={t("landing.heroCtaPrimary")}
          >
            {t("landing.heroCtaPrimary")}
          </button>
        </div>
      </div>
    </header>
  );
}
