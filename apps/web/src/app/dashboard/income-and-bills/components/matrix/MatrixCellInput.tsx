"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../../providers/LocaleProvider";

export function MatrixCellInput({
  value,
  isSurplusTarget,
}: {
  value: number;
  isSurplusTarget?: boolean;
}) {
  const { fmt } = useLocale();
  const isDeficit = Boolean(isSurplusTarget && value < 0);

  if (isSurplusTarget) {
    return (
      <div className="flex flex-col items-center">
        <span
          className={`px-2 py-0.5 font-mono font-bold text-xs rounded-md border ${
            isDeficit
              ? "bg-red-100 text-red-800 border-red-500 font-black animate-pulse"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
          title={isDeficit ? t("matrix.deficitWarning") : t("matrix.surplusTargetTitle")}
        >
          {isDeficit ? `-${fmt(Math.abs(value))}` : fmt(value)}
        </span>
      </div>
    );
  }

  return (
    <div className="w-20 text-center font-mono font-bold text-xs py-0.5 text-slate-900 dark:text-white">
      {fmt(value)}
    </div>
  );
}
