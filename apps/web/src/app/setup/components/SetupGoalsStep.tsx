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
}

interface SetupGoalsStepProps {
  goals: UserGoalItem[];
  onAddGoal: (goal: Omit<UserGoalItem, "id">) => void;
  onUpdateGoal: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemoveGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  totalSteps?: number;
}

const getFutureDate = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return new Intl.DateTimeFormat("en-CA").format(d);
};

export function SetupGoalsStep({
  goals,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onBack,
  onNext,
  totalSteps: _totalSteps = 4,
}: SetupGoalsStepProps) {
  const [customName, setCustomName] = useState("");
  const [customTarget, setCustomTarget] = useState("5000");
  const [customDate, setCustomDate] = useState("");
  const [customType, setCustomType] = useState<"TARGET_DATE" | "ONGOING">("TARGET_DATE");

  const isPresetActive = (name: string) =>
    goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: GoalPresetConfig) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      onRemoveGoal(existing.id);
    } else {
      const isOngoing = preset.mode === "ONGOING";
      const dueDate = isOngoing ? null : getFutureDate(preset.defaultMonths || 12);
      onAddGoal({
        name: preset.name,
        targetAmount: preset.defaultTarget,
        dueDate,
        goalMode: preset.mode,
        monthlyAmount: isOngoing ? preset.defaultTarget : Math.round(preset.defaultTarget / (preset.defaultMonths || 12)),
        icon: preset.icon,
      });
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const amountNum = parseFloat(customTarget) || (customType === "ONGOING" ? 250 : 1000);
    if (customType === "ONGOING") {
      onAddGoal({
        name: customName.trim(),
        targetAmount: amountNum,
        enteredAmount: amountNum,
        dueDate: null,
        goalMode: "ONGOING",
        monthlyAmount: amountNum,
        budgetFrequency: "MONTHLY",
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
    setCustomTarget(customType === "ONGOING" ? "250" : "5000");
    setCustomDate("");
  };

  const isCustomPastDate = customDate && new Date(customDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const totalTargetGoals = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#1B2B4B]">
            {t("setup.goals.title")}
          </h2>
          <InfoTooltip
            title={t("setup.goals.tooltipTitle")}
            content={t("setup.goals.tooltipContent")}
          />
          <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full ml-auto">
            {goals.length} Active Goals
          </span>
        </div>
      </div>

      <SetupGoalsPresetsGrid onTogglePreset={togglePreset} isPresetActive={isPresetActive} />

      {goals.length > 0 && (
        <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1B2B4B]">
              {t("setup.goals.yourSavingsGoals", { count: goals.length })}
            </span>
            <span className="text-xs font-extrabold text-[#2563eb] font-mono">
              Total: ${totalTargetGoals.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
            {goals.map((g) => (
              <SetupGoalItemRow
                key={g.id}
                goal={g}
                onUpdateGoal={onUpdateGoal}
                onRemoveGoal={onRemoveGoal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Goal Section */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
        <label className="text-xs font-bold text-[#1B2B4B]">{t("setup.goals.addCustomGoal")}</label>
        <div className="max-w-xs">
          <GoalModeToggle value={customType} onChange={setCustomType} />
        </div>
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
              placeholder={customType === "ONGOING" ? t("setup.goals.monthlyAmountLabel") : t("setup.goals.targetAmountLabel")}
              allowNegative={false}
            />
          </div>
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
            + Add
          </button>
        </div>
        {customType === "TARGET_DATE" && isCustomPastDate && (
          <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            {t("categories.goalPastDateWarning")}
          </p>
        )}
      </div>

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
