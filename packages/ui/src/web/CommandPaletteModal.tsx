import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  X,
  CreditCard,
  Mail,
  Calendar,
  Receipt,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { t, ASSISTANT_UNAVAILABLE_KEYS } from "@money-matters/i18n";
import { useCurrencyLocale } from "../hooks/CurrencyLocaleContext";
import type { AssistantResult } from "@money-matters/types";

export interface SearchResultAccount {
  id: string;
  name: string;
  type?: string;
  currentBalance?: number;
}

export interface SearchResultEnvelope {
  id: string;
  name: string;
  type?: string;
  currentBalance?: number;
}

export interface SearchResultEvent {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  type: "INCOME" | "EXPENSE";
}

export interface SearchResultTransaction {
  id: string;
  recordedAt: string | Date;
  amount: number;
  note?: string | null;
  flowType: string;
  envelopeName?: string | null;
  envelopeId?: string | null;
  bankAccountId?: string | null;
}

export type CommandPaletteCategory =
  | "all"
  | "accounts"
  | "envelopes"
  | "events"
  | "transactions";

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

type PaletteActionItem =
  | { kind: "quick_jump"; label: string; sublabel: string; onSelect: () => void }
  | { kind: "ai_ask"; query: string }
  | { kind: "account"; item: SearchResultAccount }
  | { kind: "envelope"; item: SearchResultEnvelope }
  | { kind: "event"; item: SearchResultEvent }
  | { kind: "transaction"; item: SearchResultTransaction }
  | { kind: "view_all_transactions"; query: string };

const SUGGESTED_CHIPS = [
  "assistant.chips.everydayBalance",
  "assistant.chips.nextPayday",
  "assistant.chips.billsDue",
  "assistant.chips.canAfford",
  "assistant.chips.goalDate",
  "assistant.chips.internetPaid",
] as const;

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
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandPaletteCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // AI Assistant State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AssistantResult | null>(null);

  // Backend Transaction Search State
  const [isSearchingTransactions, setIsSearchingTransactions] = useState(false);
  const [transactionResults, setTransactionResults] = useState<SearchResultTransaction[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const { currencySymbol, locale } = useCurrencyLocale();

  const formatAmount = useCallback(
    (amount: number) => {
      return `${currencySymbol}${Math.abs(amount).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currencySymbol, locale]
  );

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setSelectedIndex(0);
      setAiResult(null);
      setTransactionResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced transaction search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !onSearchTransactions) {
      setTransactionResults([]);
      setIsSearchingTransactions(false);
      return;
    }

    if (activeCategory !== "all" && activeCategory !== "transactions") {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTransactions(true);
      try {
        const results = await onSearchTransactions(trimmed);
        setTransactionResults(results);
      } catch {
        setTransactionResults([]);
      } finally {
        setIsSearchingTransactions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeCategory, onSearchTransactions]);

  // Filtered in-memory items
  const trimmed = query.trim().toLowerCase();

  const filteredAccounts = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "accounts") return [];
    if (!trimmed) return accounts.slice(0, 5);
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(trimmed) ||
        (a.type && a.type.toLowerCase().includes(trimmed))
    );
  }, [accounts, trimmed, activeCategory]);

  const filteredEnvelopes = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "envelopes") return [];
    if (!trimmed) return envelopes.slice(0, 5);
    return envelopes.filter(
      (e) =>
        e.name.toLowerCase().includes(trimmed) ||
        (e.type && e.type.toLowerCase().includes(trimmed))
    );
  }, [envelopes, trimmed, activeCategory]);

  const filteredEvents = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "events") return [];
    if (!trimmed) return upcomingEvents.slice(0, 5);
    return upcomingEvents.filter(
      (ev) =>
        ev.name.toLowerCase().includes(trimmed) ||
        ev.type.toLowerCase().includes(trimmed)
    );
  }, [upcomingEvents, trimmed, activeCategory]);

  const filteredTransactions = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "transactions") return [];
    return transactionResults;
  }, [transactionResults, activeCategory]);

  // Build flat action item list for keyboard navigation
  const flatItems: PaletteActionItem[] = useMemo(() => {
    const list: PaletteActionItem[] = [];

    if (!trimmed) {
      // Empty query: Show quick navigation jumps
      if (onSelectEnvelope && envelopes.length > 0) {
        list.push({
          kind: "quick_jump",
          label: t("nav.categories"),
          sublabel: t("commandPalette.sections.envelopes"),
          onSelect: () => onSelectEnvelope(envelopes[0]!),
        });
      }
      if (onSelectAccount && accounts.length > 0) {
        list.push({
          kind: "quick_jump",
          label: t("nav.bankAccounts"),
          sublabel: t("commandPalette.sections.accounts"),
          onSelect: () => onSelectAccount(accounts[0]!),
        });
      }
      return list;
    }

    // Always offer "Ask Penny" at top if query is typed
    if (onAskPenny) {
      list.push({ kind: "ai_ask", query: query.trim() });
    }

    filteredAccounts.forEach((item) => list.push({ kind: "account", item }));
    filteredEnvelopes.forEach((item) => list.push({ kind: "envelope", item }));
    filteredEvents.forEach((item) => list.push({ kind: "event", item }));
    filteredTransactions.forEach((item) => list.push({ kind: "transaction", item }));

    if (onViewAllTransactions && (filteredTransactions.length > 0 || activeCategory === "transactions")) {
      list.push({ kind: "view_all_transactions", query: query.trim() });
    }

    return list;
  }, [
    trimmed,
    query,
    onAskPenny,
    filteredAccounts,
    filteredEnvelopes,
    filteredEvents,
    filteredTransactions,
    onViewAllTransactions,
    onSelectEnvelope,
    onSelectAccount,
    envelopes,
    accounts,
    activeCategory,
  ]);

  // Reset or clamp selectedIndex when flatItems change
  useEffect(() => {
    setSelectedIndex((prev) => (prev >= flatItems.length ? 0 : prev));
  }, [flatItems.length]);

  const handleExecuteAi = useCallback(
    async (textToAsk: string) => {
      if (!onAskPenny || isAiLoading) return;
      const q = textToAsk.trim();
      if (!q) return;
      setIsAiLoading(true);
      setAiResult(null);
      try {
        const res = await onAskPenny(q);
        setAiResult(res);
        if (res.type === "prefill" && onNavigatePrefill) {
          onClose();
          onNavigatePrefill(res);
        }
      } catch {
        setAiResult({ type: "unavailable", reason: "disabled" });
      } finally {
        setIsAiLoading(false);
      }
    },
    [onAskPenny, isAiLoading, onNavigatePrefill, onClose]
  );

  const handleSelectItem = useCallback(
    (action: PaletteActionItem) => {
      switch (action.kind) {
        case "quick_jump":
          onClose();
          action.onSelect();
          break;
        case "ai_ask":
          handleExecuteAi(action.query);
          break;
        case "account":
          onClose();
          onSelectAccount?.(action.item);
          break;
        case "envelope":
          onClose();
          onSelectEnvelope?.(action.item);
          break;
        case "event":
          onClose();
          onSelectEvent?.(action.item);
          break;
        case "transaction":
          onClose();
          onSelectTransaction?.(action.item);
          break;
        case "view_all_transactions":
          onClose();
          onViewAllTransactions?.(action.query);
          break;
      }
    },
    [
      onClose,
      handleExecuteAi,
      onSelectAccount,
      onSelectEnvelope,
      onSelectEvent,
      onSelectTransaction,
      onViewAllTransactions,
    ]
  );

  // Global keydown handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelectItem(flatItems[selectedIndex]);
        } else if (query.trim() && onAskPenny) {
          handleExecuteAi(query);
        }
      } else if (e.key === "Tab") {
        if (query.trim() && onAskPenny) {
          e.preventDefault();
          handleExecuteAi(query);
        }
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-base"
            placeholder={t("commandPalette.inputPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {isAiLoading || isSearchingTransactions ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
              Esc
            </kbd>
          )}
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedIndex(0);
                }}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* AI Result Card if triggered */}
        {aiResult && (
          <div className="p-4 mx-4 mt-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t("commandPalette.sections.ai")}
              </span>
              <button
                onClick={() => setAiResult(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {aiResult.type === "answer" && (
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t(aiResult.templateKey, aiResult.templateValues)}
              </p>
            )}
            {aiResult.type === "clarify" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {t(aiResult.templateKey)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecuteAi(s)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {s}
                    </button>
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

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("commandPalette.emptyState.noResults", { query })}
              </p>
              <p className="text-xs text-slate-400">
                {t("commandPalette.emptyState.tip")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {flatItems.map((action, idx) => {
                const isSelected = idx === selectedIndex;

                if (action.kind === "quick_jump") {
                  return (
                    <button
                      key={`jump-${idx}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{action.label}</div>
                          <div className="text-xs text-slate-400">{action.sublabel}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                }

                if (action.kind === "ai_ask") {
                  return (
                    <button
                      key={`ai-ask-${idx}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            <span>{t("commandPalette.askPennyPrefix")}:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              &ldquo;{action.query}&rdquo;
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {t("commandPalette.askPennyHint")}
                          </div>
                        </div>
                      </div>
                      <CornerDownLeft className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                }

                if (action.kind === "account") {
                  return (
                    <button
                      key={`acc-${action.item.id}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{action.item.name}</div>
                          <div className="text-xs text-slate-400">
                            {t("commandPalette.sections.accounts")}
                            {action.item.type ? ` · ${action.item.type}` : ""}
                          </div>
                        </div>
                      </div>
                      {action.item.currentBalance !== undefined && (
                        <div className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                          {formatAmount(action.item.currentBalance)}
                        </div>
                      )}
                    </button>
                  );
                }

                if (action.kind === "envelope") {
                  return (
                    <button
                      key={`env-${action.item.id}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{action.item.name}</div>
                          <div className="text-xs text-slate-400">
                            {t("commandPalette.sections.envelopes")}
                            {action.item.type ? ` · ${action.item.type}` : ""}
                          </div>
                        </div>
                      </div>
                      {action.item.currentBalance !== undefined && (
                        <div className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                          {formatAmount(action.item.currentBalance)}
                        </div>
                      )}
                    </button>
                  );
                }

                if (action.kind === "event") {
                  const isIncome = action.item.type === "INCOME";
                  return (
                    <button
                      key={`ev-${action.item.id}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isIncome
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{action.item.name}</div>
                          <div className="text-xs text-slate-400">
                            {action.item.dueDate} · {isIncome ? t("common.income") : t("common.expense")}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-mono text-sm font-medium tabular-nums ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatAmount(action.item.amount)}
                      </div>
                    </button>
                  );
                }

                if (action.kind === "transaction") {
                  const isOutflow = action.item.flowType === "OUTFLOW";
                  return (
                    <button
                      key={`tx-${action.item.id}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {action.item.note || t("commandPalette.sections.transactions")}
                          </div>
                          <div className="text-xs text-slate-400">
                            {action.item.envelopeName ? `${action.item.envelopeName} · ` : ""}
                            {new Date(action.item.recordedAt).toLocaleDateString(locale)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-mono text-sm font-medium tabular-nums ${
                          isOutflow
                            ? "text-slate-900 dark:text-slate-100"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isOutflow ? "-" : "+"}
                        {formatAmount(action.item.amount)}
                      </div>
                    </button>
                  );
                }

                if (action.kind === "view_all_transactions") {
                  return (
                    <button
                      key={`view-all-${idx}`}
                      onClick={() => handleSelectItem(action)}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors ${
                        isSelected ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span>{t("commandPalette.viewAllTransactions")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Quick AI Chips when query is empty */}
          {!query && (
            <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("assistant.suggestedTitle")}
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CHIPS.filter((chipKey) => hasSimulation || chipKey !== "assistant.chips.canAfford").map((chipKey) => {
                  const label = t(chipKey);
                  return (
                    <button
                      key={chipKey}
                      onClick={() => {
                        setQuery(label);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <span>{label}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info & usage quota */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">
                ↑↓
              </kbd>{" "}
              {t("commandPalette.footer.navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">
                ↵
              </kbd>{" "}
              {t("commandPalette.footer.select")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded text-[10px]">
                Tab
              </kbd>{" "}
              {t("commandPalette.footer.askAi")}
            </span>
          </div>
          {typeof remainingCalls === "number" && (
            <span className="font-mono text-slate-400">
              {t("commandPalette.footer.callsLeft", { remaining: remainingCalls })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
