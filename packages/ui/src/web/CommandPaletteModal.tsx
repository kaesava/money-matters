"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Sparkles, ArrowRight, Loader2, X } from "lucide-react";
import { t, ASSISTANT_UNAVAILABLE_KEYS } from "@money-matters/i18n";
import type { AssistantResult } from "@money-matters/types";
import {
  useCommandPaletteState,
  COMMAND_PALETTE_CHIPS,
  type SearchResultAccount,
  type SearchResultEnvelope,
  type SearchResultEvent,
  type SearchResultTransaction,
  type CommandPaletteCategory,
} from "../hooks/useCommandPaletteState";
import { CommandPaletteActionRow, type PaletteActionItem } from "./CommandPaletteActionRow";

export type {
  SearchResultAccount,
  SearchResultEnvelope,
  SearchResultEvent,
  SearchResultTransaction,
  CommandPaletteCategory,
};

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
  remainingCalls?: number;
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
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  onNavigatePrefill,
  remainingCalls,
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

  const {
    query, setQuery, activeCategory, setActiveCategory, isAiLoading, aiResult, setAiResult,
    isSearchingTransactions, trimmed, filteredAccounts, filteredEnvelopes, filteredEvents,
    filteredTransactions, handleExecuteAi, formatAmount, locale,
  } = useCommandPaletteState({
    isOpen, onClose, accounts, envelopes, upcomingEvents, onSearchTransactions, onAskPenny, onNavigatePrefill,
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const flatItems: PaletteActionItem[] = useMemo(() => {
    const list: PaletteActionItem[] = [];
    if (!trimmed) {
      if (onSelectEnvelope && envelopes.length > 0) {
        list.push({ kind: "quick_jump", label: t("nav.categories"), sublabel: t("commandPalette.sections.envelopes"), onSelect: () => onSelectEnvelope(envelopes[0]!) });
      }
      if (onSelectAccount && accounts.length > 0) {
        list.push({ kind: "quick_jump", label: t("nav.bankAccounts"), sublabel: t("commandPalette.sections.accounts"), onSelect: () => onSelectAccount(accounts[0]!) });
      }
      return list;
    }
    if (onAskPenny) list.push({ kind: "ai_ask", query: query.trim() });
    filteredAccounts.forEach((item) => list.push({ kind: "account", item }));
    filteredEnvelopes.forEach((item) => list.push({ kind: "envelope", item }));
    filteredEvents.forEach((item) => list.push({ kind: "event", item }));
    filteredTransactions.forEach((item) => list.push({ kind: "transaction", item }));
    if (onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions")) {
      list.push({ kind: "view_all_transactions", query: query.trim() });
    }
    return list;
  }, [trimmed, query, onAskPenny, filteredAccounts, filteredEnvelopes, filteredEvents, filteredTransactions, onViewAllTransactions, onSelectEnvelope, onSelectAccount, envelopes, accounts, activeCategory]);

  useEffect(() => {
    setSelectedIndex((prev) => (prev >= flatItems.length ? 0 : prev));
  }, [flatItems.length]);

  const handleSelectItem = useCallback(
    (action: PaletteActionItem) => {
      if (action.kind === "ai_ask") {
        handleExecuteAi(action.query);
        return;
      }
      onClose();
      if (action.kind === "quick_jump") action.onSelect();
      else if (action.kind === "account") onSelectAccount?.(action.item);
      else if (action.kind === "envelope") onSelectEnvelope?.(action.item);
      else if (action.kind === "event") onSelectEvent?.(action.item);
      else if (action.kind === "transaction") onSelectTransaction?.(action.item);
      else if (action.kind === "view_all_transactions") onViewAllTransactions?.(action.query);
    },
    [onClose, handleExecuteAi, onSelectAccount, onSelectEnvelope, onSelectEvent, onSelectTransaction, onViewAllTransactions]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p + 1 < flatItems.length ? p + 1 : 0)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p - 1 >= 0 ? p - 1 : flatItems.length - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) handleSelectItem(flatItems[selectedIndex]);
        else if (query.trim() && onAskPenny) handleExecuteAi(query);
      } else if (e.key === "Tab" && query.trim() && onAskPenny) {
        e.preventDefault();
        handleExecuteAi(query);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, handleSelectItem, handleExecuteAi, query, onAskPenny, onClose]);

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
            placeholder={t("commandPalette.inputPlaceholder")}
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
            {aiResult.type === "answer" && <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t(aiResult.templateKey, aiResult.templateValues)}</p>}
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
              <p className="text-sm text-amber-600 dark:text-amber-400">{t(ASSISTANT_UNAVAILABLE_KEYS[aiResult.reason] ?? "assistant.unavailable.disabled")}</p>
            )}
          </div>
        )}

        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {flatItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("commandPalette.emptyState.noResults", { query })}</p>
              <p className="text-xs text-slate-400">{t("commandPalette.emptyState.tip")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {flatItems.map((action, idx) => (
                <CommandPaletteActionRow
                  key={`${action.kind}-${idx}`}
                  action={action}
                  isSelected={idx === selectedIndex}
                  formatAmount={formatAmount}
                  locale={locale}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          )}

          {!query && (
            <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t("assistant.suggestedTitle")}</span>
              <div className="flex flex-wrap gap-2">
                {COMMAND_PALETTE_CHIPS.filter((chipKey) => hasSimulation || chipKey !== "assistant.chips.canAfford").map((chipKey) => {
                  const label = t(chipKey);
                  return (
                    <button key={chipKey} onClick={() => { setQuery(label); inputRef.current?.focus(); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <span>{label}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">↑↓</kbd> {t("commandPalette.footer.navigate")}</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">↵</kbd> {t("commandPalette.footer.select")}</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">Tab</kbd> {t("commandPalette.footer.askAi")}</span>
          </div>
          {typeof remainingCalls === "number" && (
            <span className="font-mono text-slate-400">{t("commandPalette.footer.callsLeft", { remaining: remainingCalls })}</span>
          )}
        </div>
      </div>
    </div>
  );
};
