"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { t } from "@money-matters/i18n";
import { COMMAND_PALETTE_CHIPS } from "../hooks/useCommandPaletteState";
import { CommandPaletteActionRow, type PaletteActionItem } from "./CommandPaletteActionRow";

export interface PaletteGroup {
  id: string;
  titleKey: string;
  items: PaletteActionItem[];
}

interface CommandPaletteResultsListProps {
  groups: PaletteGroup[];
  selectedIndex: number;
  query: string;
  hasAiAssistant: boolean;
  hasSimulation: boolean;
  formatAmount: (amount: number) => string;
  locale: string;
  timeZone: string;
  onSelectItem: (action: PaletteActionItem) => void;
  onChipAsk: (label: string) => void;
  resultsContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const CommandPaletteResultsList: React.FC<CommandPaletteResultsListProps> = ({
  groups,
  selectedIndex,
  query,
  hasAiAssistant,
  hasSimulation,
  formatAmount,
  locale,
  timeZone,
  onSelectItem,
  onChipAsk,
  resultsContainerRef,
}) => {
  let cursor = 0;
  return (
    <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 space-y-2">
      {groups.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("commandPalette.emptyState.noResults", { query })}
          </p>
          <p className="text-xs text-slate-400">{t("commandPalette.emptyState.tip")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t(group.titleKey)}
              </div>
              {group.items.map((action, i) => {
                const flatIndex = cursor++;
                return (
                  <CommandPaletteActionRow
                    key={`${group.id}-${action.kind}-${i}`}
                    action={action}
                    flatIndex={flatIndex}
                    isSelected={flatIndex === selectedIndex}
                    formatAmount={formatAmount}
                    locale={locale}
                    timeZone={timeZone}
                    onSelect={onSelectItem}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {!query && hasAiAssistant && (
        <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("assistant.suggestedTitle")}
          </span>
          <div className="flex flex-wrap gap-2">
            {COMMAND_PALETTE_CHIPS.filter((chipKey) => hasSimulation || chipKey !== "assistant.chips.canAfford").map(
              (chipKey) => {
                const label = t(chipKey);
                return (
                  <button
                    key={chipKey}
                    onClick={() => onChipAsk(label)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{label}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
};
