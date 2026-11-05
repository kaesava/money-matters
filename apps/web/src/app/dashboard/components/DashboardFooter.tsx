"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import type { AppVersionInfo } from "@money-matters/types";

export interface DashboardFooterProps {
  versionInfo: AppVersionInfo;
}

export function DashboardFooter({ versionInfo }: DashboardFooterProps) {
  return (
    <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 border-t border-zinc-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 font-medium">
      <div>
        <span>Money Matters {versionInfo.formattedVersion} ({versionInfo.channel})</span>
      </div>
      <div className="flex items-center gap-3">
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors">
          {t("legal.privacyPolicy")}
        </a>
        <span>•</span>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors">
          {t("legal.termsOfService")}
        </a>
      </div>
    </footer>
  );
}
