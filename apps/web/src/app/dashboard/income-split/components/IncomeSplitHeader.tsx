"use client";

import React from "react";
import { Button, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface IncomeSplitHeaderProps {
  readonly title: string;
  readonly expectedDate: string;
  readonly isSavedPlan: boolean;
  readonly isConfirmedPlan: boolean;
  readonly isDirty: boolean;
  readonly isReadOnly: boolean;
  readonly isDeficit: boolean;
  readonly submitting: boolean;
  readonly isFutureDate: boolean;
  readonly onBack: () => void;
  readonly onResetEdits: () => void;
  readonly onRecalculate?: () => void;
  readonly onDeleteIncome: () => void;
  readonly onSaveSplit: () => void;
  readonly onConfirmSplit: () => void;
}

export function IncomeSplitHeader({
  title,
  expectedDate,
  isSavedPlan,
  isConfirmedPlan,
  isDirty,
  isReadOnly,
  isDeficit,
  submitting,
  isFutureDate,
  onBack,
  onResetEdits,
  onRecalculate,
  onDeleteIncome,
  onSaveSplit,
  onConfirmSplit,
}: IncomeSplitHeaderProps) {
  const { fmtDate } = useLocale();
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
      {/* Left Navigation and Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-[#1B2B4B] dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <span className="text-sm">←</span>
          <span>{t("paydayDrawer.back")}</span>
        </button>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base md:text-lg font-black text-[#1B2B4B] dark:text-white tracking-tight truncate">
              {title || t("paydayDrawer.title")}
            </h1>

            {/* Plan Source Badges */}
            {isConfirmedPlan ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <span>✓</span>
                <span>{t("paydayDrawer.confirmedBadge")}</span>
                <InfoTooltip
                  position="bottom"
                  align="left"
                  title={t("paydayDrawer.confirmedBadge")}
                  content={t("paydayDrawer.confirmedBadgeTooltip")}
                />
              </span>
            ) : isSavedPlan ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shrink-0">
                <span>💾</span>
                <span>{t("paydayDrawer.savedBadge")}</span>
                <InfoTooltip
                  position="bottom"
                  align="left"
                  title={t("paydayDrawer.savedBadge")}
                  content={t("paydayDrawer.savedBadgeTooltip")}
                />
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-[#2563eb] dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
                <span>✨</span>
                <span>{t("paydayDrawer.autoBadge")}</span>
                <InfoTooltip
                  position="bottom"
                  align="left"
                  title={t("paydayDrawer.autoBadge")}
                  content={t("paydayDrawer.autoBadgeTooltip")}
                />
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
            {fmtDate(expectedDate)} • {t("paydayDrawer.subtitle")}
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onRecalculate && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRecalculate}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#2563eb] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span>
              <span>{t("paydayDrawer.recalculate")}</span>
            </button>
            <InfoTooltip
              position="bottom"
              align="right"
              title={t("paydayDrawer.recalculate")}
              content={
                isSavedPlan
                  ? t("paydayDrawer.recalculateSavedTooltip")
                  : t("paydayDrawer.recalculateAutoTooltip")
              }
            />
          </div>
        )}

        {!isReadOnly ? (
          <>
            <button
              type="button"
              onClick={onResetEdits}
              disabled={!isDirty || submitting}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {t("paydayDrawer.resetEdits")}
            </button>

            <button
              type="button"
              onClick={onDeleteIncome}
              disabled={submitting}
              className="px-2.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {t("common.delete")}
            </button>

            {isFutureDate ? (
              <Button
                type="button"
                onClick={onSaveSplit}
                loading={submitting}
                disabled={isDeficit || submitting}
                className="px-4 py-2 text-xs font-bold shadow-sm cursor-pointer"
              >
                {t("common.save")}
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSaveSplit}
                  disabled={isDeficit || submitting}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:underline cursor-pointer disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
                <Button
                  type="button"
                  onClick={onConfirmSplit}
                  loading={submitting}
                  disabled={isDeficit || submitting}
                  variant="danger"
                  className="px-5 py-2 text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {t("paydayDrawer.runIncomeSplit")}
                </Button>
              </>
            )}
          </>
        ) : null}
      </div>
    </header>
  );
}
