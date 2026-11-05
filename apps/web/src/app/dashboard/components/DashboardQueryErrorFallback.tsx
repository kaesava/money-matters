"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { Spinner } from "@money-matters/ui/web";

export interface DashboardQueryErrorFallbackProps {
  cooldownSeconds: number;
  isRetrying: boolean;
  onRetry: () => void;
  errorMessage?: string | null;
}

export function DashboardQueryErrorFallback({
  cooldownSeconds,
  isRetrying,
  onRetry,
  errorMessage,
}: DashboardQueryErrorFallbackProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl p-8 shadow-xl space-y-5">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-amber-200/80 dark:border-amber-900/60 font-bold shadow-xs">
          📡
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-[#1B2B4B] dark:text-white">
            {t("common.error")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
            {t("common.errorTryAgain")}
          </p>
        </div>

        <button
          type="button"
          disabled={cooldownSeconds > 0 || isRetrying}
          onClick={onRetry}
          className="w-full py-3.5 px-6 bg-[#2563eb] hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isRetrying ? (
            <Spinner size="sm" />
          ) : cooldownSeconds > 0 ? (
            <span>{t("common.retry")} ({cooldownSeconds}s)</span>
          ) : (
            <span>{t("common.retry")}</span>
          )}
        </button>

        <details className="text-left text-[10px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <summary className="cursor-pointer font-bold hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            {t("common.technicalDetails")}
          </summary>
          <div className="mt-2 p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-mono break-all text-[10px]">
            {errorMessage || "Network unreachable / timeout"}
          </div>
        </details>
      </div>
    </div>
  );
}
