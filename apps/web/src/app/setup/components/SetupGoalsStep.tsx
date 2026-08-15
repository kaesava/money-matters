"use client";

import React, { useState } from "react";

export interface UserGoalItem {
  id: string;
  name: string;
  monthlyAmount: number;
  icon: string;
  targetAmount?: number;
  dueDate?: string;
}

interface SetupGoalsStepProps {
  goals: UserGoalItem[];
  onAddGoal: (goal: Omit<UserGoalItem, "id">) => void;
  onUpdateGoal: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemoveGoal: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const PRESET_GOALS = [
  { name: "Emergency Reserve (3-6 Months)", icon: "🛡️", defaultMonthly: 300, defaultTarget: 10000 },
  { name: "Annual Family Holiday", icon: "✈️", defaultMonthly: 250, defaultTarget: 5000 },
  { name: "Car Rego, Service & Tyres", icon: "🚗", defaultMonthly: 150, defaultTarget: 1800 },
  { name: "Home Maintenance & Repairs", icon: "🏡", defaultMonthly: 200, defaultTarget: 4000 },
  { name: "Investment & Wealth Building", icon: "📈", defaultMonthly: 400, defaultTarget: 20000 },
  { name: "Tech & Gadget Upgrade", icon: "💻", defaultMonthly: 100, defaultTarget: 1500 },
];

export function SetupGoalsStep({
  goals,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onBack,
  onNext,
}: SetupGoalsStepProps) {
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("150");
  const [customIcon, setCustomIcon] = useState("🎯");

  const isPresetActive = (name: string) => goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: typeof PRESET_GOALS[0]) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      onRemoveGoal(existing.id);
    } else {
      onAddGoal({
        name: preset.name,
        monthlyAmount: preset.defaultMonthly,
        icon: preset.icon,
        targetAmount: preset.defaultTarget,
      });
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onAddGoal({
      name: customName.trim(),
      monthlyAmount: parseFloat(customAmount) || 100,
      icon: customIcon || "🎯",
    });
    setCustomName("");
    setCustomAmount("150");
  };

  const totalMonthlyGoals = goals.reduce((sum, g) => sum + (g.monthlyAmount || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#1B2B4B]">🎯 Savings & Future Goals</h2>
          <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
            {goals.length} Active Goals
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Budgeting isn&apos;t just about paying bills — it&apos;s about making your money work for what matters most. What are you saving up for?
        </p>
      </div>

      {/* Preset Goal Cards Grid */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-black text-[#1B2B4B]">Popular Goal Presets (Tap to toggle):</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_GOALS.map((preset) => {
            const active = isPresetActive(preset.name);
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
                  <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                    Est. ${preset.defaultMonthly}/mo target
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
              Total Goals: ${totalMonthlyGoals}/mo
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
            {goals.map((g) => (
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

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      value={g.monthlyAmount}
                      onChange={(e) => onUpdateGoal(g.id, "monthlyAmount", parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs font-bold text-right rounded-lg border border-zinc-200 bg-slate-50"
                    />
                    <span className="text-[11px] font-bold text-zinc-400">/mo</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveGoal(g.id)}
                    className="text-xs text-red-500 font-bold hover:text-red-700 p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Goal Section */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 flex flex-col gap-3">
        <label className="text-xs font-bold text-[#1B2B4B]">Add a Custom Savings Goal:</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={customIcon}
            onChange={(e) => setCustomIcon(e.target.value)}
            className="w-16 px-2 py-2 text-sm rounded-xl border border-zinc-200 bg-slate-50"
          >
            <option value="🎯">🎯 Goal</option>
            <option value="🏖️">🏖️ Beach</option>
            <option value="💍">💍 Wedding</option>
            <option value="🎓">🎓 Education</option>
            <option value="🎁">🎁 Gift</option>
            <option value="⛵">⛵ Boat</option>
          </select>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Goal name (e.g. Wedding Fund, Japan 2026)"
            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
          />
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Monthly $"
            className="w-28 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-4 py-2 bg-teal-50 border border-teal-200 text-[#00B4A6] text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors"
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
