import React from "react";
import { AUSTRALIAN_FAMILY_PRESETS, SetupPreset } from "@money-matters/types";
import { t } from "@money-matters/i18n";

interface CategorySelectStepProps {
  selectedPresets: Set<string>;
  togglePreset: (id: string) => void;
  customCategoryName: string;
  setCustomCategoryName: (name: string) => void;
  customCategories: SetupPreset[];
  onAddCustomCategory: () => void;
  targets: Record<string, string>;
  setTarget: (id: string, val: string) => void;
  defaultExcessId: string;
  setDefaultExcessId: (id: string) => void;
  onBack: () => void;
  onComplete: () => void;
  isSubmitting: boolean;
}

export function CategorySelectStep({
  selectedPresets,
  togglePreset,
  customCategoryName,
  setCustomCategoryName,
  customCategories,
  onAddCustomCategory,
  targets,
  setTarget,
  defaultExcessId,
  setDefaultExcessId,
  onBack,
  onComplete,
  isSubmitting,
}: CategorySelectStepProps) {
  const allAvailable = [...AUSTRALIAN_FAMILY_PRESETS, ...customCategories];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-[#1B2B4B]">📋 Which bills do you have?</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Tick the ones that apply and adjust the monthly amounts. We&apos;ll handle the rest.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Regular Bills & Obligations</span>
          <div className="grid grid-cols-1 gap-2">
            {allAvailable.filter(p => p.type === 'REGULAR').map((preset) => {
              const isSelected = selectedPresets.has(preset.id);
              return (
                <div
                  key={preset.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isSelected ? "bg-teal-50/40 border-[#00B4A6] shadow-xs" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => togglePreset(preset.id)}>
                    <span className="text-xl">{preset.emoji}</span>
                    <span className="text-xs font-bold text-[#1B2B4B]">{preset.name}</span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400">Monthly ($)</span>
                      <input
                        type="number"
                        step="1"
                        value={targets[preset.id] ?? ""}
                        onChange={(e) => setTarget(preset.id, e.target.value)}
                        placeholder={preset.suggestedMonthlyAud.toString()}
                        className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-right"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => togglePreset(preset.id)}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? "bg-[#00B4A6] text-white" : "border border-zinc-300 bg-white"
                    }`}
                  >
                    {isSelected && "✓"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Savings Goals</span>
          <div className="grid grid-cols-1 gap-2">
            {allAvailable.filter(p => p.type === 'GOAL').map((preset) => {
              const isSelected = selectedPresets.has(preset.id);
              return (
                <div
                  key={preset.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isSelected ? "bg-teal-50/40 border-[#00B4A6] shadow-xs" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => togglePreset(preset.id)}>
                    <span className="text-xl">{preset.emoji}</span>
                    <span className="text-xs font-bold text-[#1B2B4B]">{preset.name}</span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-400">Target ($)</span>
                      <input
                        type="number"
                        step="1"
                        value={targets[preset.id] ?? ""}
                        onChange={(e) => setTarget(preset.id, e.target.value)}
                        placeholder={preset.suggestedMonthlyAud.toString()}
                        className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6] text-right"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => togglePreset(preset.id)}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected ? "bg-[#00B4A6] text-white" : "border border-zinc-300 bg-white"
                    }`}
                  >
                    {isSelected && "✓"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
        <input
          type="text"
          placeholder="Add custom bill or goal name..."
          value={customCategoryName}
          onChange={(e) => setCustomCategoryName(e.target.value)}
          className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />
        <button
          onClick={onAddCustomCategory}
          disabled={!customCategoryName.trim()}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm animate-pulse"
        >
          + Add
        </button>
      </div>

      {selectedPresets.size > 0 && (
        <div className="flex flex-col gap-1 p-3 bg-teal-50/30 rounded-2xl border border-teal-200/50">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#00B4A6]">{t('setup.configure.excessLabel', { defaultValue: 'Where should leftover money go?' })}</label>
          <select
            value={defaultExcessId}
            onChange={(e) => setDefaultExcessId(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          >
            {allAvailable.filter(p => selectedPresets.has(p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={onComplete}
          disabled={isSubmitting || selectedPresets.size === 0}
          className="px-6 py-3 rounded-xl text-xs font-black text-white bg-[#00B4A6] hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md"
        >
          {isSubmitting ? "Completing Setup..." : "Complete Setup 🎉"}
        </button>
      </div>
    </div>
  );
}
