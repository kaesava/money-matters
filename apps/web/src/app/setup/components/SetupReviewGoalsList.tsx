"use client";

import React, { useState } from "react";
import { EstimatedCategoryItem } from "@money-matters/types";
import { ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { UserGoalItem } from "./SetupGoalsStep";
import { useLocale } from "../../../providers/LocaleProvider";

interface SetupReviewGoalsListProps {
  activeGoals: EstimatedCategoryItem[];
  goals: UserGoalItem[];
  totalGoalMonthly: number;
  onRemoveCategory: (name: string) => void;
  onEditGoal?: (category: EstimatedCategoryItem) => void;
  isRerun?: boolean;
}

export function SetupReviewGoalsList({
  activeGoals,
  goals,
  totalGoalMonthly,
  onRemoveCategory,
  onEditGoal,
  isRerun = false,
}: SetupReviewGoalsListProps) {
  const { fmt, fmtDateMedium } = useLocale();
  const [goalToArchive, setGoalToArchive] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
          {t("setup.reviewSummary.savingsGoals")}
        </span>
        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200 font-mono">
          {t("setup.reviewSummary.monthlyEstBadge", { amount: fmt(totalGoalMonthly) })}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {activeGoals.map((cat) => {
          const userGoal = goals.find((g) => g.name.trim().toLowerCase() === cat.name.trim().toLowerCase());
          const isSurplusTarget = Boolean(
            userGoal?.isSurplusTarget ?? cat.isSurplusTarget
          );
          const isExistingDbGoal = Boolean(userGoal?.id && !userGoal.id.startsWith("g-"));

          const isOngoing = userGoal?.fundingMode === "RECURRING" || (!userGoal?.dueDate && Boolean(userGoal?.budgetFrequency));
          const freq = userGoal?.budgetFrequency || "MONTHLY";
          const freqSuffix =
            freq === "WEEKLY"
              ? t("setup.freqSuffixWk")
              : freq === "FORTNIGHTLY"
              ? t("setup.freqSuffixFn")
              : freq === "QUARTERLY"
              ? t("setup.freqSuffixQtr")
              : freq === "ANNUALLY"
              ? t("setup.freqSuffixYr")
              : t("setup.freqSuffixMo");
          const enteredAmt = userGoal?.enteredAmount ?? userGoal?.targetAmount ?? cat.monthlyAud;

          let displayMetric: string;
          if (isOngoing) {
            displayMetric =
              freq === "MONTHLY"
                ? `${fmt(enteredAmt)} ${t("setup.freqSuffixMo")}`
                : t("setup.reviewSummary.ongoingEstMetric", {
                    entered: fmt(enteredAmt),
                    freqSuffix,
                    monthly: fmt(cat.monthlyAud),
                  });
          } else {
            const targetAmt = userGoal?.targetAmount ?? cat.monthlyAud;
            displayMetric = userGoal?.dueDate
              ? t("setup.reviewSummary.targetWithDateMetric", {
                  amount: fmt(targetAmt),
                  date: fmtDateMedium(userGoal.dueDate),
                  monthly: fmt(cat.monthlyAud),
                })
              : t("setup.reviewSummary.targetNoDateMetric", {
                  amount: fmt(targetAmt),
                  monthly: fmt(cat.monthlyAud),
                });
          }

          return (
            <div
              key={cat.name}
              className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white gap-2"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#1B2B4B] truncate">{cat.name}</span>
                {isSurplusTarget && (
                  <span className="text-[10px] font-bold text-teal-600">
                    {t("setup.reviewSummary.surplusTargetHelp")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold font-mono text-zinc-700">
                  {displayMetric}
                </span>
                {onEditGoal && (
                  <button
                    type="button"
                    onClick={() =>
                      onEditGoal({
                        ...cat,
                        id: userGoal?.id || cat.id,
                        type: "GOAL",
                        envelopeType: "GOAL",
                        fundingMode: userGoal?.fundingMode ?? cat.fundingMode ?? "TARGET_BALANCE",
                        isPriority: userGoal?.isPriority ?? cat.isPriority ?? true,
                        isSurplusTarget,
                        bankAccountId: userGoal?.bankAccountId ?? cat.bankAccountId,
                        targetAmount: userGoal?.targetAmount ?? cat.targetAmount ?? null,
                        enteredAmount: userGoal?.enteredAmount ?? cat.enteredAmount ?? null,
                        endDate: userGoal?.dueDate ?? cat.endDate ?? null,
                        budgetFrequency: userGoal?.budgetFrequency ?? cat.budgetFrequency ?? "MONTHLY",
                        startDate: userGoal?.startDate ?? cat.startDate ?? null,
                        rrule: userGoal?.rrule ?? cat.rrule ?? null,
                      })
                    }
                    className="px-2 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    {t("common.edit")}
                  </button>
                )}
                {isSurplusTarget ? (
                  <span className="inline-flex items-center" title={t("categories.cannotDeleteSpecialEnvelope")}>
                    <InfoTooltip content={t("categories.cannotDeleteSpecialEnvelope")} />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRerun && isExistingDbGoal) {
                        setGoalToArchive(cat.name);
                      } else {
                        onRemoveCategory(cat.name);
                      }
                    }}
                    className="text-xs font-bold text-red-400 hover:text-red-600 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={Boolean(goalToArchive)}
        onClose={() => setGoalToArchive(null)}
        onConfirm={() => {
          if (goalToArchive) {
            onRemoveCategory(goalToArchive);
            setGoalToArchive(null);
          }
        }}
        title={t("setup.confirmArchiveEnvelopeTitle")}
        description={t("setup.confirmArchiveEnvelopeDesc", { name: goalToArchive || "" })}
        confirmLabel={t("common.remove")}
        variant="danger"
      />
    </div>
  );
}
