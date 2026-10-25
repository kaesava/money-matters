"use client";

import React from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { t } from "@money-matters/i18n";
import { UserGoalItem } from "./SetupGoalsStep";
import { useLocale } from "../../../providers/LocaleProvider";

interface SetupReviewGoalsListProps {
  activeGoals: EstimatedCategoryItem[];
  goals: UserGoalItem[];
  totalGoalMonthly: number;
  onRemoveCategory: (name: string) => void;
}

export function SetupReviewGoalsList({
  activeGoals,
  goals,
  totalGoalMonthly,
  onRemoveCategory,
}: SetupReviewGoalsListProps) {
  const { fmt } = useLocale();
  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
          {t("setup.reviewSummary.savingsGoals")}
        </span>
        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200 font-mono">
          Monthly Est: {fmt(totalGoalMonthly)}/mo
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {activeGoals.map((cat) => {
          const userGoal = goals.find((g) => g.name.trim().toLowerCase() === cat.name.trim().toLowerCase());
          const isSurplusTarget =
            userGoal?.name.toLowerCase().includes("emergency") ||
            userGoal?.name.toLowerCase().includes("reserve") ||
            cat.name.toLowerCase().includes("emergency") ||
            cat.name.toLowerCase().includes("reserve");

          const isOngoing = userGoal?.goalMode === "ONGOING" || (!userGoal?.dueDate && userGoal?.budgetFrequency);
          const freq = userGoal?.budgetFrequency || "MONTHLY";
          const freqSuffix = freq === "WEEKLY" ? "/wk" : freq === "FORTNIGHTLY" ? "/fn" : freq === "ANNUALLY" ? "/yr" : "/mo";
          const enteredAmt = userGoal?.enteredAmount ?? userGoal?.targetAmount ?? cat.monthlyAud;

          let displayMetric: string;
          if (isOngoing) {
            displayMetric = freq === "MONTHLY"
              ? `${fmt(enteredAmt)}/mo`
              : `${fmt(enteredAmt)}${freqSuffix} (Est: ${fmt(cat.monthlyAud)}/mo)`;
          } else {
            const targetAmt = userGoal?.targetAmount ?? cat.monthlyAud;
            const targetDateStr = userGoal?.dueDate ? ` • By ${userGoal.dueDate}` : "";
            displayMetric = `Target: ${fmt(targetAmt)}${targetDateStr} (Est: ${fmt(cat.monthlyAud)}/mo)`;
          }

          return (
            <div
              key={cat.name}
              className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1B2B4B]">{cat.name}</span>
                {isSurplusTarget && (
                  <span className="text-[10px] font-bold text-teal-600">
                    {t("setup.reviewSummary.surplusTargetHelp")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-zinc-700">
                  {displayMetric}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveCategory(cat.name)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
