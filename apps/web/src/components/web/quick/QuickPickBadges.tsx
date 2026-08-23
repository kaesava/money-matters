import React from "react";

export interface QuickPresetItem {
  name: string;
  amount?: string;
  categoryId?: string;
  sourceCategoryId?: string;
  destinationCategoryId?: string;
  receivingAccountId?: string;
}

interface QuickPickBadgesProps {
  readonly presets: QuickPresetItem[];
  readonly onSelect: (preset: QuickPresetItem) => void;
}

export function QuickPickBadges({ presets, onSelect }: QuickPickBadgesProps) {
  if (!presets || presets.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 pt-1 pb-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
        ⚡ Quick Pick (Last 3 Saved)
      </span>
      <div className="flex flex-wrap gap-2">
        {presets.slice(0, 3).map((p, idx) => (
          <button
            key={`${p.name}-${idx}`}
            type="button"
            onClick={() => onSelect(p)}
            className="px-2.5 py-1 text-xs font-bold text-[#1B2B4B] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
          >
            <span>⚡ {p.name}</span>
            {p.amount && (
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">
                (${p.amount})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
