"use client";

import React from "react";
import { IncomeItem } from "@money-matters/types";
import { InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { SetupIncomeItemRow } from "./SetupIncomeItemRow";

interface SetupIncomeStepProps {
  incomes: IncomeItem[];
  isRerun?: boolean;
  dirtyIncomeIds?: Set<string>;
  onAddIncome: () => void;
  onUpdateIncome: <K extends keyof IncomeItem>(id: string, field: K, value: IncomeItem[K]) => void;
  onRemoveIncome: (id: string) => void;
  onSaveIncome?: (id: string) => Promise<void>;
  onNext: () => void;
  totalSteps?: number;
}

export function SetupIncomeStep({
  incomes,
  isRerun = false,
  dirtyIncomeIds = new Set(),
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  onSaveIncome,
  onNext,
  totalSteps = 4,
}: SetupIncomeStepProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Retention Hero Banner (First run only) */}
      {!isRerun && (
        <div className="p-5 bg-gradient-to-br from-[#1B2B4B] to-[#2563eb] text-white rounded-2xl shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300 bg-white/10 px-3 py-1 rounded-full border border-teal-300/30">
              {t("setup.income.heroBadge")}
            </span>
            <span className="text-xs font-bold text-slate-300">{t("setup.stepOf", { step: 1, total: totalSteps })}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
            {t("setup.income.heroTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {t("setup.income.heroSubtitle")}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-black text-[#1B2B4B]">{t("setup.income.sectionTitle")}</h3>
          <InfoTooltip
            title={t("setup.income.takeHomePayTooltipTitle")}
            content={t("setup.income.takeHomePayTooltipContent")}
          />
        </div>
        {isRerun && (
          <p className="text-xs text-zinc-500 mt-1">
            {t("setup.income.rerunEditNotice")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
        {incomes.map((inc, index) => (
          <SetupIncomeItemRow
            key={inc.id}
            inc={inc}
            index={index}
            canRemove={incomes.length > 1}
            isRerun={isRerun}
            isDirty={dirtyIncomeIds.has(inc.id)}
            onUpdateIncome={onUpdateIncome}
            onRemoveIncome={onRemoveIncome}
            onSaveIncome={onSaveIncome}
          />
        ))}

        <button
          type="button"
          onClick={onAddIncome}
          className="py-2.5 px-4 bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          + {t("setup.income.addIncomeSchedule")}
        </button>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md cursor-pointer"
        >
          {t("setup.income.continueToGoals")}
        </button>
      </div>
    </div>
  );
}
