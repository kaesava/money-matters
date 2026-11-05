"use client";

import React from "react";
import Image from "next/image";
import { t } from "@money-matters/i18n";

export interface DashboardMobileHeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
  onOpenAskPenny: () => void;
  onNavigateToSettings: () => void;
  avatarUrl?: string | null;
  userName?: string | null;
  initials: string;
}

export function DashboardMobileHeader({
  onOpenMobileMenu,
  title,
  onOpenAskPenny,
  onNavigateToSettings,
  avatarUrl,
  userName,
  initials,
}: DashboardMobileHeaderProps) {
  return (
    <header
      style={{ backgroundColor: "var(--dash-navy)" }}
      className="md:hidden sticky top-0 z-40 h-14 flex items-center px-4 justify-between shadow-md"
    >
      <button
        onClick={onOpenMobileMenu}
        className="p-1 text-white/80 hover:text-white transition-colors"
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <span className="text-sm font-extrabold text-white">
        {title || t("app.title")}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAskPenny}
          className="p-1.5 rounded-lg text-blue-200 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 transition-colors flex items-center justify-center cursor-pointer"
          title={t("assistant.triggerTitle")}
          aria-label={t("assistant.triggerTitle")}
        >
          <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="cursor-pointer rounded-full overflow-hidden"
          title={t("settings.profile.title")}
          aria-label={t("settings.profile.title")}
        >
          {avatarUrl ? (
            <Image
              unoptimized
              src={avatarUrl}
              alt={userName || "User"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black ring-1 ring-white/20"
              style={{ backgroundColor: "#2563eb" }}
            >
              {initials}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
