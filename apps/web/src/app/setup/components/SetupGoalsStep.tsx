"use client";

import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { InfoTooltip, AmountField, GoalModeToggle } from "@money-matters/ui/web";
import { SetupGoalsPresetsGrid, GoalPresetConfig } from "./SetupGoalsPresetsGrid";
import { SetupGoalItemRow } from "./SetupGoalItemRow";

export interface UserGoalItem {
  id: string;
  name: string;
  monthlyAmount: number;
  icon: string;
  targetAmount?: number | null;
  dueDate?: string | null;
  goalMode?: "TARGET_DATE" | "ONGOING";
  enteredAmount?: number | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
  startDate?: string | null;
  rrule?: string | null;
  isPrivate?: boolean;
  isSurplusTarget?: boolean;
}

interface SetupGoalsStepProps {
  goals: UserGoalItem[];
  isRerun?: boolean;
  dirtyGoalIds?: Set<string>;
  onAddGoal: (goal: Omit<UserGoalItem, "id">) => void;
  onUpdateGoal: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemoveGoal: (id: string) => void;
  onSaveGoal?: (id: string) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  totalSteps?: number;
  isAud?: boolean;
}

const getFutureDate = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return new Intl.DateTimeFormat("en-CA").format(d);
};

export function SetupGoalsStep({
  goals,
  isRerun = false,
  dirtyGoalIds = new Set(),
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onSaveGoal,
  onBack,
  onNext,
  totalSteps = 4,
  isAud = true,
}: SetupGoalsStepProps) {
  const [customName, setCustomName] = useState("");
  const [customTarget, setCustomTarget] = useState(isAud ? "5000" : "0");
  const [customDate, setCustomDate] = useState("");
  const [customType, setCustomType] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");
  const [customFrequency, setCustomFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("MONTHLY");

  const isPresetActive = (name: string) =>
    goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: GoalPresetConfig) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      onRemoveGoal(existing.id);
    } else {
      const isOngoing = preset.mode === "ONGOING";
      const dueDate = isOngoing ? null : getFutureDate(preset.defaultMonths || 12);
      const targetVal = isAud ? preset.defaultTarget : 0;
      onAddGoal({
        name: preset.name,
        targetAmount: targetVal,
        dueDate,
        goalMode: preset.mode,
        monthlyAmount: isOngoing ? targetVal : Math.round(targetVal / (preset.defaultMonths || 12)),
        icon: preset.icon,
      });
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const amountNum = parseFloat(customTarget) || (isAud ? (customType === "ONGOING" ? 250 : 1000) : 0);
    if (customType === "ONGOING") {
      const monthly = customFrequency === "WEEKLY"
        ? Math.round((amountNum * 52) / 12)
        : customFrequency === "FORTNIGHTLY"
        ? Math.round((amountNum * 26) / 12)
        : customFrequency === "ANNUALLY"
        ? Math.round(amountNum / 12)
        : Math.round(amountNum);
      onAddGoal({
        name: customName.trim(),
        targetAmount: amountNum,
        enteredAmount: amountNum,
        dueDate: null,
        goalMode: "ONGOING",
        monthlyAmount: monthly,
        budgetFrequency: customFrequency,
        icon: "target",
      });
    } else {
      const dueDate = customDate || getFutureDate(12);
      onAddGoal({
        name: customName.trim(),
        targetAmount: amountNum,
        dueDate,
        goalMode: "TARGET_DATE",
        monthlyAmount: Math.round(amountNum / 12),
        icon: "target",
      });
    }
    setCustomName("");
    setCustomDate("");
    setCustomTarget("5000");
  };

  const isCustomPastDate =
    customType === "TARGET_DATE" && customDate && new Date(customDate) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">
              {t("setup.goals.title")}
            </h2>
            <InfoTooltip
              title={t("setup.goals.tooltipTitle")}
              content={t("setup.goals.tooltipContent")}
            />
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {t("setup.stepOf", { step: isRerun ? 2 : 3, total: totalSteps })}
          </span>
        </div>
      </div>

      {/* Popular Presets Grid */}
      <div className="flex flex-col gap-3">
        <SetupGoalsPresetsGrid
          isPresetActive={isPresetActive}
          onTogglePreset={togglePreset}
          isAud={isAud}
        />
      </div>

      {/* Add Custom Goal Section */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
        <label className="text-xs font-bold text-[#1B2B4B]">{t("setup.goals.addCustomGoal")}</label>
        <div className="max-w-xs">
          <GoalModeToggle value={customType} onChange={setCustomType} />
        </div>
        {customType === "ONGOING" && (
          <p className="text-[11px] text-zinc-500 font-medium">
            {t("setup.goals.recurringMonthlyNote")}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t("setup.goals.customGoalPlaceholder")}
            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
          />
          <div className="w-36">
            <AmountField
              value={customTarget}
              onChange={setCustomTarget}
              placeholder={customType === "ONGOING" ? t("setup.goals.recurringContributionLabel") : t("setup.goals.targetAmountLabel")}
              allowNegative={false}
            />
          </div>
          {customType === "ONGOING" && (
            <select
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY")}
              className="w-32 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white font-mono cursor-pointer"
            >
              <option value="WEEKLY">{t("categories.frequencyWeekly")} (/wk)</option>
              <option value="FORTNIGHTLY">{t("categories.frequencyFortnightly")} (/fn)</option>
              <option value="MONTHLY">{t("categories.frequencyMonthly")} (/mo)</option>
              <option value="ANNUALLY">{t("categories.frequencyAnnually")} (/yr)</option>
            </select>
          )}
          {customType === "TARGET_DATE" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-36 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
            />
          )}
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customName.trim()}
            className="px-4 py-2 bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            + {t("common.add")}
          </button>
        </div>
        {customType === "TARGET_DATE" && isCustomPastDate && (
          <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            {t("categories.goalPastDateWarning")}
          </p>
        )}
      </div>

      {/* Goals List (Placed below Add Goal, with zero scroll trap) */}
      {goals.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-[#1B2B4B]">
            {t("setup.goals.yourSavingsGoals", { count: goals.length })}
          </span>
          <div className="flex flex-col gap-2">
            {goals.map((g) => (
              <SetupGoalItemRow
                key={g.id}
                goal={g}
                isRerun={isRerun}
                isDirty={dirtyGoalIds.has(g.id)}
                onUpdateGoal={onUpdateGoal}
                onRemoveGoal={onRemoveGoal}
                onSaveGoal={onSaveGoal}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer"
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md cursor-pointer"
        >
          {t("common.next")} →
        </button>
      </div>
    </div>
  );
}
