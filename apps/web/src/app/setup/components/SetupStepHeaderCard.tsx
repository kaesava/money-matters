"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip } from "@money-matters/ui/web";

interface SetupStepHeaderCardProps {
  step: number;
  totalSteps: number;
  title: string;
  tooltipTitle?: string;
  tooltipContent?: string;
  badgeLabel?: string;
  pillContent?: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  isNextLoading?: boolean;
}

export function SetupStepHeaderCard({
  step,
  totalSteps,
  title,
  tooltipTitle,
  tooltipContent,
  badgeLabel,
  pillContent,
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel,
  backLabel,
  isNextLoading = false,
}: SetupStepHeaderCardProps) {
  return (
    <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Step label, Title, Tooltip, Badge */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#2563eb]">
              {t("setup.stepOf", { step, total: totalSteps })}
            </span>
            {badgeLabel && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {badgeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B] tracking-tight">
              {title}
            </h2>
            {tooltipContent && (
              <InfoTooltip title={tooltipTitle} content={tooltipContent} />
            )}
          </div>
        </div>

        {/* Right: Calculation Pill & Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {pillContent && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 font-mono shadow-2xs">
              {pillContent}
            </div>
          )}

          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                {backLabel || t("common.back")}
              </button>
            )}

            {onNext && (
              <button
                type="button"
                disabled={nextDisabled || isNextLoading}
                onClick={onNext}
                className="px-4 py-1.5 text-xs font-black text-white bg-[#2563eb] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{nextLabel || `${t("common.next")} →`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
