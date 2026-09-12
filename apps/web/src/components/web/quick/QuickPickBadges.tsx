import React from "react";
import { t } from "@money-matters/i18n";

export interface QuickPresetItem {
  name: string;
  amount?: string;
  categoryId?: string;
  sourceCategoryId?: string;
  destinationCategoryId?: string;
  receivingAccountId?: string;
}

interface QuickPickBadgesProps {
  readonly recentPresets?: QuickPresetItem[];
  readonly frequentPresets?: QuickPresetItem[];
  readonly presets?: QuickPresetItem[];
  readonly onSelect: (preset: QuickPresetItem) => void;
}

export function QuickPickBadges({
  recentPresets,
  frequentPresets,
  presets,
  onSelect,
}: QuickPickBadgesProps) {
  const recents = recentPresets || (presets ? presets.slice(0, 2) : []);
  const frequents = frequentPresets || [];

  if (recents.length === 0 && frequents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 pt-1 pb-1">
      {recents.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t("quickPick.recent", { defaultValue: "Recent" })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recents.map((p, idx) => (
              <button
                key={`recent-${p.name}-${idx}`}
                type="button"
                onClick={() => onSelect(p)}
                className="px-2.5 py-1 text-xs font-semibold text-[#1B2B4B] bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs hover:border-slate-300 cursor-pointer"
              >
                <span>{p.name}</span>
                {p.amount && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    (${p.amount})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {frequents.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t("quickPick.frequent", { defaultValue: "Frequent" })}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {frequents.map((p, idx) => (
              <button
                key={`freq-${p.name}-${idx}`}
                type="button"
                onClick={() => onSelect(p)}
                className="px-2.5 py-1 text-xs font-semibold text-[#1B2B4B] bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs hover:border-slate-300 cursor-pointer"
              >
                <span>{p.name}</span>
                {p.amount && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    (${p.amount})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
