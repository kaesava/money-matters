import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { t } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";

export interface AskPennyPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
}

const SUGGESTED_CHIPS = [
  "assistant.chips.everydayBalance",
  "assistant.chips.nextPayday",
  "assistant.chips.billsDue",
  "assistant.chips.canAfford",
  "assistant.chips.goalDate",
  "assistant.chips.internetPaid",
] as const;

export const AskPennyPalette: React.FC<AskPennyPaletteProps> = ({
  isOpen,
  onClose,
  onAsk,
  onNavigatePrefill,
  remainingCalls,
}) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (textToAsk: string) => {
    const q = textToAsk.trim();
    if (!q || isLoading) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await onAsk(q);
      setResult(res);
      if (res.type === "prefill") {
        onClose();
        onNavigatePrefill(res);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (label: string) => {
    setQuery(label);
    setResult(null);

    const currencyMatch = label.match(/\$\d+(?:\.\d{2})?/);
    const goalMatch = label.match(/\b(?:my\s+)?Goal\b/i);

    setTimeout(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      if (currencyMatch && currencyMatch.index !== undefined) {
        inputRef.current.setSelectionRange(
          currencyMatch.index,
          currencyMatch.index + currencyMatch[0].length
        );
      } else if (goalMatch && goalMatch.index !== undefined) {
        inputRef.current.setSelectionRange(
          goalMatch.index,
          goalMatch.index + goalMatch[0].length
        );
      } else {
        inputRef.current.setSelectionRange(label.length, label.length);
      }
    }, 10);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-base"
            placeholder={t("assistant.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit(query);
              }
            }}
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : (
            <button
              onClick={() => handleSubmit(query)}
              disabled={!query.trim()}
              className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {result && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              {result.type === "answer" && (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t(result.templateKey, result.templateValues)}
                </p>
              )}
              {result.type === "clarify" && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {t(result.templateKey)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleChipClick(s)}
                        className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {result.type === "unavailable" && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t(`assistant.unavailable.${result.reason}`)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("assistant.suggestedTitle")}
            </span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_CHIPS.map((chipKey) => {
                const label = t(chipKey);
                return (
                  <button
                    key={chipKey}
                    onClick={() => handleChipClick(label)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{label}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {typeof remainingCalls === "number" && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
            <span>{t("assistant.subtitle")}</span>
            <span className="font-mono">{remainingCalls} left</span>
          </div>
        )}
      </div>
    </div>
  );
};
