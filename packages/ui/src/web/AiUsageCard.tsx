import React from "react";
import { Sparkles } from "lucide-react";
import { t } from "@money-matters/i18n";

export interface AiUsageCardProps {
  used: number;
  limit: number;
  resetsOn: string;
}

export const AiUsageCard: React.FC<AiUsageCardProps> = ({ used, limit, resetsOn }) => {
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {t("assistant.settingsCard.title")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("assistant.settingsCard.description")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {t("assistant.settingsCard.usedLabel", { used, limit })}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage > 90
                ? "bg-red-500"
                : percentage > 75
                ? "bg-amber-500"
                : "bg-blue-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
        <span>{t("assistant.settingsCard.resetsOn", { date: resetsOn })}</span>
        <span className="text-slate-400 dark:text-slate-500">
          {t("assistant.settingsCard.freeNotice")}
        </span>
      </div>
    </div>
  );
};
