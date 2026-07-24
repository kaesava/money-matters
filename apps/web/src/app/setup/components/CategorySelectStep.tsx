import React from "react";

export interface PresetCategory {
  id: string;
  name: string;
  type: "GOAL" | "REGULAR" | "EVERYDAY";
  icon: string;
}

interface CategorySelectStepProps {
  presets: PresetCategory[];
  selectedPresets: Set<string>;
  togglePreset: (id: string) => void;
  customCategoryName: string;
  setCustomCategoryName: (name: string) => void;
  customCategories: PresetCategory[];
  onAddCustomCategory: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function CategorySelectStep({
  presets,
  selectedPresets,
  togglePreset,
  customCategoryName,
  setCustomCategoryName,
  customCategories,
  onAddCustomCategory,
  onBack,
  onNext,
}: CategorySelectStepProps) {
  const allAvailable = [...presets, ...customCategories];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-[#1B2B4B]">Step 2: Choose Your Budget Categories</h2>
        <p className="text-xs text-zinc-500 font-semibold mt-1">
          Select standard savings goals and regular obligations or add your own custom categories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allAvailable.map((preset) => {
          const isSelected = selectedPresets.has(preset.id);
          return (
            <div
              key={preset.id}
              onClick={() => togglePreset(preset.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? "bg-teal-50/50 border-[#00B4A6] shadow-sm"
                  : "bg-white border-zinc-200/80 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{preset.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1B2B4B]">{preset.name}</span>
                  <span className="text-[10px] text-zinc-400 font-medium">{preset.type}</span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isSelected ? "bg-[#00B4A6] text-white" : "border border-zinc-300 bg-white"
                }`}
              >
                {isSelected && "✓"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
        <input
          type="text"
          placeholder="Add custom category name..."
          value={customCategoryName}
          onChange={(e) => setCustomCategoryName(e.target.value)}
          className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />
        <button
          onClick={onAddCustomCategory}
          disabled={!customCategoryName.trim()}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B4A6] hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          + Add
        </button>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all"
        >
          ← Back
        </button>

        <button
          onClick={onNext}
          disabled={selectedPresets.size === 0}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1B2B4B] hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
        >
          Next: Set Targets & Frequencies →
        </button>
      </div>
    </div>
  );
}
