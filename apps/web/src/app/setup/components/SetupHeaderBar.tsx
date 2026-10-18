"use client";

import React from "react";
import { t } from "@money-matters/i18n";

interface SetupHeaderBarProps {
  isRerun: boolean;
  step: number;
  totalSteps: number;
  isReviewStep: boolean;
  onCancel: () => void;
}

export function SetupHeaderBar({
  isRerun,
  step,
  totalSteps,
  isReviewStep,
  onCancel,
}: SetupHeaderBarProps) {
  return (
    <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-[#1B2B4B] tracking-tight">Money Matters</span>
        <span className="text-xs font-bold text-slate-300">|</span>
        <span className="text-xs font-bold text-slate-500">
          {isRerun ? t("setup.recalibrateTitle") : t("setup.wizardTitle")}
          {!isReviewStep && ` (${t("setup.stepOf", { step, total: totalSteps })})`}
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
        title={`${t("setup.cancelSetup")} (Esc)`}
      >
        <span className="text-sm font-black leading-none">✕</span>
        <span>{t("setup.cancelSetup")}</span>
      </button>
    </div>
  );
}
