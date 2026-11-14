"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Sparkles, Loader2, X } from "lucide-react";
import { t, ASSISTANT_UNAVAILABLE_KEYS } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import {
  useCommandPaletteState,
  type SearchResultAccount,
  type SearchResultEnvelope,
  type SearchResultEvent,
  type SearchResultPage,
  type SearchResultTransaction,
  type CommandPaletteCategory,
} from "../hooks/useCommandPaletteState";
import { formatAiAnswerText } from "../hooks/commandPaletteHelpers";
import { useDateLocale } from "../hooks/DateLocaleContext";
import type { PaletteActionItem } from "./CommandPaletteActionRow";
import { CommandPaletteResultsList, type PaletteGroup } from "./CommandPaletteResultsList";

export type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultPage,
  SearchResultTransaction,
  CommandPaletteCategory,
};

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages?: SearchResultPage[];
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
  hasAiAssistant?: boolean;
  onSelectPage?: (page: SearchResultPage) => void;
  onSelectAccount?: (account: SearchResultAccount) => void;
  onSelectEnvelope?: (envelope: SearchResultEnvelope) => void;
  onSelectEvent?: (event: SearchResultEvent) => void;
  onSelectTransaction?: (transaction: SearchResultTransaction) => void;
  onViewAllTransactions?: (query: string) => void;
  hasSimulation?: boolean;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  pages = [],
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  onNavigatePrefill,
  remainingCalls,
  hasAiAssistant = true,
  onSelectPage,
  onSelectAccount,
  onSelectEnvelope,
  onSelectEvent,
  onSelectTransaction,
  onViewAllTransactions,
  hasSimulation = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const { timeZone } = useDateLocale();

  const {
    query, setQuery, activeCategory, setActiveCategory, isAiLoading, aiResult, setAiResult,
    isSearchingTransactions, trimmed, filteredPages, filteredAccounts, filteredEnvelopes, filteredEvents,
    filteredTransactions, shouldPrioritizeAi, handleExecuteAi, formatAmount, locale,
  } = useCommandPaletteState({
    isOpen, onClose, pages, accounts, envelopes, upcomingEvents, onSearchTransactions, onAskPenny, hasAiAssistant, onNavigatePrefill,
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const groups: PaletteGroup[] = useMemo(() => {
    const list: PaletteGroup[] = [];
    const aiAction: PaletteActionItem[] =
      trimmed && hasAiAssistant && onAskPenny
        ? [{ kind: "ai_ask", query: query.trim(), isPrioritized: shouldPrioritizeAi }]
        : [];
    if (trimmed && shouldPrioritizeAi && aiAction.length > 0) {
      list.push({ id: "ai", titleKey: "commandPalette.sections.ai", items: aiAction });
    }
    if (filteredPages.length > 0) {
      list.push({ id: "pages", titleKey: "commandPalette.sections.pages", items: filteredPages.map((item) => ({ kind: "page", item })) });
    }
    if (filteredAccounts.length > 0) {
      list.push({ id: "accounts", titleKey: "commandPalette.sections.accounts", items: filteredAccounts.map((item) => ({ kind: "account", item })) });
    }
    if (filteredEnvelopes.length > 0) {
      list.push({ id: "envelopes", titleKey: "commandPalette.sections.envelopes", items: filteredEnvelopes.map((item) => ({ kind: "envelope", item })) });
    }
    if (filteredEvents.length > 0) {
      list.push({ id: "events", titleKey: "commandPalette.sections.upcoming", items: filteredEvents.map((item) => ({ kind: "event", item })) });
    }
    const txItems: PaletteActionItem[] = filteredTransactions.map((item) => ({ kind: "transaction", item }));
    if (trimmed && onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions")) {
      txItems.push({ kind: "view_all_transactions", query: query.trim() });
    }
    if (txItems.length > 0) {
      list.push({ id: "transactions", titleKey: "commandPalette.sections.transactions", items: txItems });
    }
    if (trimmed && !shouldPrioritizeAi && aiAction.length > 0) {
      list.push({ id: "ai", titleKey: "commandPalette.sections.ai", items: aiAction });
    }
    return list;
  }, [trimmed, query, shouldPrioritizeAi, hasAiAssistant, onAskPenny, filteredPages, filteredAccounts, filteredEnvelopes, filteredEvents, filteredTransactions, onViewAllTransactions, activeCategory]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setSelectedIndex((prev) => (prev >= flatItems.length ? 0 : prev));
  }, [flatItems.length]);

  useEffect(() => {
    if (!isOpen) return;
    resultsContainerRef.current?.querySelector(`[data-palette-idx="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, selectedIndex]);

  const handleSelectItem = useCallback(
    (action: PaletteActionItem) => {
      if (action.kind === "ai_ask") {
        handleExecuteAi(action.query);
        return;
      }
      onClose();
      if (action.kind === "quick_jump") action.onSelect();
      else if (action.kind === "page") onSelectPage?.(action.item);
      else if (action.kind === "account") onSelectAccount?.(action.item);
      else if (action.kind === "envelope") onSelectEnvelope?.(action.item);
      else if (action.kind === "event") onSelectEvent?.(action.item);
      else if (action.kind === "transaction") onSelectTransaction?.(action.item);
      else if (action.kind === "view_all_transactions") onViewAllTransactions?.(action.query);
    },
    [onClose, handleExecuteAi, onSelectPage, onSelectAccount, onSelectEnvelope, onSelectEvent, onSelectTransaction, onViewAllTransactions]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (flatItems.length ? (p + 1) % flatItems.length : 0)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (flatItems.length ? (p - 1 + flatItems.length) % flatItems.length : 0)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) handleSelectItem(flatItems[selectedIndex]);
        else if (query.trim() && hasAiAssistant && onAskPenny) handleExecuteAi(query);
      } else if (e.key === "Tab" && query.trim() && hasAiAssistant && onAskPenny) {
        e.preventDefault();
        handleExecuteAi(query);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, handleSelectItem, handleExecuteAi, query, hasAiAssistant, onAskPenny, onClose]);

  if (!isOpen) return null;

  const categories: { id: CommandPaletteCategory; label: string }[] = [
    { id: "all", label: t("commandPalette.categories.all") },
    { id: "accounts", label: t("commandPalette.categories.accounts") },
    { id: "envelopes", label: t("commandPalette.categories.envelopes") },
    { id: "events", label: t("commandPalette.categories.events") },
    { id: "transactions", label: t("commandPalette.categories.transactions") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(hasAiAssistant ? "commandPalette.triggerTitle" : "commandPalette.searchOnlyTitle")}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-base"
            placeholder={t(hasAiAssistant ? "commandPalette.inputPlaceholder" : "commandPalette.searchOnlyPlaceholder")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          {isAiLoading || isSearchingTransactions ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => { setQuery(""); setSelectedIndex(0); inputRef.current?.focus(); }} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">Esc</kbd>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedIndex(0); }}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
                activeCategory === cat.id
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {aiResult && (
          <div className="p-4 mx-4 mt-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t("commandPalette.sections.ai")}
              </span>
              <button onClick={() => setAiResult(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-3.5 h-3.5" /></button>
            </div>
            {aiResult.type === "answer" && (
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {formatAiAnswerText(aiResult, t)}
              </p>
            )}
            {aiResult.type === "clarify" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t(aiResult.templateKey)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.suggestions.map((s, idx) => (
                    <button key={idx} onClick={() => handleExecuteAi(s)} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {aiResult.type === "unavailable" && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t(ASSISTANT_UNAVAILABLE_KEYS[aiResult.reason] ?? "assistant.unavailable.disabled")}
              </p>
            )}
          </div>
        )}

        <CommandPaletteResultsList
          groups={groups}
          selectedIndex={selectedIndex}
          query={query}
          hasAiAssistant={hasAiAssistant}
          hasSimulation={hasSimulation}
          formatAmount={formatAmount}
          locale={locale}
          timeZone={timeZone}
          onSelectItem={handleSelectItem}
          onChipAsk={handleExecuteAi}
          resultsContainerRef={resultsContainerRef}
        />

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">↑↓</kbd> {t("commandPalette.footer.navigate")}</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">↵</kbd> {t("commandPalette.footer.select")}</span>
            {hasAiAssistant && (
              <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">Tab</kbd> {t("commandPalette.footer.askAi")}</span>
            )}
          </div>
          {hasAiAssistant && typeof remainingCalls === "number" && (
            <span className="font-mono text-slate-400">{t("commandPalette.footer.callsLeft", { remaining: remainingCalls })}</span>
          )}
        </div>
      </div>
    </div>
  );
};
