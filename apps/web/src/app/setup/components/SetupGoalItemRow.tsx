"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { AmountField } from "@money-matters/ui/web";
import { UserGoalItem } from "./SetupGoalsStep";

interface SetupGoalItemRowProps {
  goal: UserGoalItem;
  isRerun?: boolean;
  isDirty?: boolean;
  onUpdateGoal: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemoveGoal: (id: string) => void;
  onSaveGoal?: (id: string) => Promise<void>;
  onOpenCustomSchedule?: (goal: UserGoalItem) => void;
}

function getMonthsDiff(targetDateStr?: string | null): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function getFrequencyUnitLabel(freq?: string | null): string {
  if (freq === "WEEKLY") return "/wk";
  if (freq === "FORTNIGHTLY") return "/fn";
  if (freq === "ANNUALLY") return "/yr";
  return "/mo";
}

export function SetupGoalItemRow({
  goal,
  onUpdateGoal,
  onRemoveGoal,
  onOpenCustomSchedule,
}: SetupGoalItemRowProps) {
  const isOngoing = goal.goalMode === "ONGOING";
  const months = isOngoing ? 1 : getMonthsDiff(goal.dueDate);
  const isPast = !isOngoing && goal.dueDate && new Date(goal.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const unitLabel = getFrequencyUnitLabel(goal.budgetFrequency);

  return (
    <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span
          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
            isOngoing ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {isOngoing ? t("setup.goals.recurringBadge") : t("setup.goals.targetDateBadge")}
        </span>
        <div>
          <input
            type="text"
            value={goal.name}
            onChange={(e) => onUpdateGoal(goal.id, "name", e.target.value)}
            className="text-xs font-bold text-[#1B2B4B] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#2563eb] outline-none"
          />
          {isPast && (
            <span className="block text-[10px] font-bold text-amber-700">
              {t("categories.goalPastDateWarning")}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
        <div className="w-36">
          <AmountField
            value={
              isOngoing
                ? goal.enteredAmount !== undefined && goal.enteredAmount !== null
                  ? String(goal.enteredAmount)
                  : goal.monthlyAmount ? String(goal.monthlyAmount) : ""
                : goal.targetAmount ? String(goal.targetAmount) : ""
            }
            onChange={(val) => {
              const num = parseFloat(val) || 0;
              if (isOngoing) {
                onUpdateGoal(goal.id, "enteredAmount", num);
                onUpdateGoal(goal.id, "monthlyAmount", num);
                onUpdateGoal(goal.id, "targetAmount", num);
              } else {
                onUpdateGoal(goal.id, "targetAmount", num);
                onUpdateGoal(goal.id, "monthlyAmount", Math.round(num / months));
              }
            }}
            placeholder={isOngoing ? t("setup.goals.recurringContributionLabel") : t("setup.goals.targetAmountLabel")}
            allowNegative={false}
          />
        </div>

        {!isOngoing ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-zinc-400">{t("setup.goals.byDateLabel")}</span>
            <input
              type="date"
              value={goal.dueDate || ""}
              onChange={(e) => {
                const dateVal = e.target.value;
                onUpdateGoal(goal.id, "dueDate", dateVal);
                const m = getMonthsDiff(dateVal);
                onUpdateGoal(goal.id, "monthlyAmount", Math.round((goal.targetAmount || 0) / m));
              }}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 bg-slate-50 text-slate-800"
            />
          </div>
        ) : (
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200/60 font-mono">
            {unitLabel}
          </span>
        )}

        {onOpenCustomSchedule && (
          <button
            type="button"
            onClick={() => onOpenCustomSchedule(goal)}
            className="text-[11px] font-bold text-[#2563eb] hover:underline cursor-pointer"
          >
            {t("setup.goals.customSchedule")}
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemoveGoal(goal.id)}
          className="text-xs text-red-500 font-bold hover:text-red-700 p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>

    </div>
  );
}
