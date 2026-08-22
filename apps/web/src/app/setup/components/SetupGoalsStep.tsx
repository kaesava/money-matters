"use client";

import React, { useState } from "react";
import { InfoTooltip } from "@money-matters/ui";

export interface UserGoalItem {
  id: string;
  name: string;
  monthlyAmount: number;
  icon: string;
  targetAmount: number;
  dueDate: string;
  isPrivate?: boolean;
}

interface SetupGoalsStepProps {
  goals: UserGoalItem[];
  onAddGoal: (goal: Omit<UserGoalItem, "id">) => void;
  onUpdateGoal: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemoveGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const getFutureDate = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
};

const PRESET_GOALS = [
  { name: "Emergency Reserve (3-6 Months)", icon: "🛡️", defaultTarget: 10000, defaultMonths: 12 },
  { name: "Annual Family Holiday", icon: "✈️", defaultTarget: 5000, defaultMonths: 12 },
  { name: "New Car", icon: "🚗", defaultTarget: 15000, defaultMonths: 24 },
  { name: "Home Maintenance & Repairs", icon: "🏡", defaultTarget: 4000, defaultMonths: 12 },
  { name: "Investment & Wealth Building", icon: "📈", defaultTarget: 20000, defaultMonths: 36 },
  { name: "Tech & Gadget Upgrade", icon: "💻", defaultTarget: 1500, defaultMonths: 6 },
];

function getMonthsDiff(targetDateStr: string): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function SetupGoalsStep({
  goals,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onBack,
  onNext,
}: SetupGoalsStepProps) {
  const [customName, setCustomName] = useState("");
  const [customTarget, setCustomTarget] = useState("5000");
  const [customDate, setCustomDate] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  const isPresetActive = (name: string) => goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: typeof PRESET_GOALS[0]) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      onRemoveGoal(existing.id);
    } else {
      const dueDate = getFutureDate(preset.defaultMonths);
      const months = Math.max(1, preset.defaultMonths);
      onAddGoal({
        name: preset.name,
        targetAmount: preset.defaultTarget,
        dueDate,
        monthlyAmount: Math.round(preset.defaultTarget / months),
        icon: preset.icon,
      });
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customDate) return;
    const targetAmount = parseFloat(customTarget) || 1000;
    const months = getMonthsDiff(customDate);
    onAddGoal({
      name: customName.trim(),
      targetAmount,
      dueDate: customDate,
      monthlyAmount: Math.round(targetAmount / months),
      icon: "🎯",
    });
    setCustomName("");
    setCustomTarget("5000");
    setCustomDate("");
  };

  const totalTargetGoals = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#1B2B4B]">🎯 Savings &amp; Future Goals</h2>
          <InfoTooltip
            title="Sinking Funds & Goals"
            content="Setting target amounts and target dates for your goals allows the waterfall engine to automatically reserve funds every payday. The actual amount allocated will depend on paydays, etc. and this is a guide only."
          />
          <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full ml-auto">
            {goals.length} Active Goals
          </span>
        </div>
      </div>

      {/* Preset Goal Cards Grid */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-[#1B2B4B]">Popular Goal Presets (Tap to toggle):</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_GOALS.map((preset) => {
            const active = isPresetActive(preset.name);
            const months = preset.defaultMonths;
            const estMonthly = Math.round(preset.defaultTarget / months);
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => togglePreset(preset)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  active
                    ? "bg-teal-50/90 border-[#00B4A6] shadow-sm ring-1 ring-[#00B4A6]"
                    : "bg-white border-zinc-200 hover:border-teal-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{preset.icon}</span>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      active ? "bg-[#00B4A6] text-white" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {active ? "✓" : "+"}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-[#1B2B4B] line-clamp-1">{preset.name}</div>
                  <div className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                    Target: ${preset.defaultTarget.toLocaleString()} • Est. ${estMonthly}/mo
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Selected Goals Table */}
      {goals.length > 0 && (
        <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1B2B4B]">Your Savings Targets ({goals.length})</span>
            <span className="text-xs font-extrabold text-[#00B4A6]">
              Total Target: ${totalTargetGoals.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
            {goals.map((g) => {
              const months = getMonthsDiff(g.dueDate);
              const estMonthly = Math.round((g.targetAmount || 0) / months);
              return (
                <div
                  key={g.id}
                  className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{g.icon || "🎯"}</span>
                    <div>
                      <input
                        type="text"
                        value={g.name}
                        onChange={(e) => onUpdateGoal(g.id, "name", e.target.value)}
                        className="text-xs font-bold text-[#1B2B4B] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-[#2563eb] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-zinc-400">Target $</span>
                      <input
                        type="number"
                        value={g.targetAmount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdateGoal(g.id, "targetAmount", val);
                          onUpdateGoal(g.id, "monthlyAmount", Math.round(val / months));
                        }}
                        className="w-24 px-2 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-slate-50 font-mono"
                        placeholder="Target Amount"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-zinc-400">By</span>
                      <input
                        type="date"
                        min={todayStr}
                        value={g.dueDate || ""}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          onUpdateGoal(g.id, "dueDate", dateVal);
                          const m = getMonthsDiff(dateVal);
                          onUpdateGoal(g.id, "monthlyAmount", Math.round((g.targetAmount || 0) / m));
                        }}
                        className="px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 bg-slate-50"
                      />
                    </div>

                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200/60">
                      Est. ${estMonthly}/mo guide
                    </span>

                    <button
                      type="button"
                      onClick={() => onRemoveGoal(g.id)}
                      className="text-xs text-red-500 font-bold hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-500 italic mt-1">
            ℹ️ Note: The actual amount allocated will depend on paydays, income waterfalls, and your target date — the monthly amount above is a guide only.
          </p>
        </div>
      )}

      {/* Add Custom Goal Section */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
        <label className="text-xs font-bold text-[#1B2B4B]">Add a Custom Savings Goal:</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Goal name (e.g. Wedding Fund, Japan 2026)"
            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
          />
          <input
            type="number"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="Target Amount ($)"
            className="w-32 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 font-mono"
          />
          <input
            type="date"
            min={todayStr}
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-36 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customName.trim() || !customDate}
            className="px-4 py-2 bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            + Add Goal
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-700"
        >
          ← Back to Income
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 text-xs font-bold rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition-all shadow-md"
        >
          Continue to Lifestyle Setup →
        </button>
      </div>
    </div>
  );
}
