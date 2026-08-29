"use client";

import React from "react";
import { t } from "@money-matters/i18n";

export interface NetworkErrorBannerProps {
  isVisible: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  message?: string | null;
}

export function NetworkErrorBanner({
  isVisible,
  onRetry,
  onDismiss,
  message,
}: NetworkErrorBannerProps) {
  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-[#1B2B4B] text-white px-4 py-3 shadow-lg border-b border-rose-500/30 animate-in slide-in-from-top duration-300 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-bold text-sm">
          ⚡
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
            <span>{t("networkError.title", { defaultValue: "Connection Interrupted" })}</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider hidden sm:inline-block">
              {t("networkError.badge", { defaultValue: "Server / Database Unreachable" })}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 truncate">
            {message || t("networkError.defaultMessage", { defaultValue: "We're having trouble reaching Money Matters servers. Your data is safe. Please check your internet connection." })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">{t("networkError.retryBtn", { defaultValue: "Retry Connection" })}</span>
            <span className="sm:hidden">{t("networkError.retryBtnShort", { defaultValue: "Retry" })}</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t("networkError.dismissBtn", { defaultValue: "Dismiss banner" })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
