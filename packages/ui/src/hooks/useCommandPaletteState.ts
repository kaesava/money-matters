import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { AssistantResult } from "@money-matters/types";
import { useCurrencyLocale } from "./CurrencyLocaleContext";
import {
  filterPagesByQuery,
  mapTrpcAssistantError,
  shouldPrioritizeAskPenny,
  type SearchResultPage,
} from "./commandPaletteHelpers";

export type { SearchResultPage };

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

export type CommandPaletteCategory = "all" | "accounts" | "envelopes" | "events" | "transactions";

export const COMMAND_PALETTE_CHIPS = [
  "assistant.chips.everydayBalance",
  "assistant.chips.nextPayday",
  "assistant.chips.billsDue",
  "assistant.chips.canAfford",
  "assistant.chips.goalDate",
  "assistant.chips.internetPaid",
] as const;

export interface UseCommandPaletteStateParams {
  isOpen: boolean;
  onClose: () => void;
  pages?: SearchResultPage[];
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  hasAiAssistant?: boolean;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
}

export function useCommandPaletteState({
  isOpen,
  onClose,
  pages = [],
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  hasAiAssistant = true,
  onNavigatePrefill,
}: UseCommandPaletteStateParams) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandPaletteCategory>("all");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AssistantResult | null>(null);
  const [isSearchingTransactions, setIsSearchingTransactions] = useState(false);
  const [transactionResults, setTransactionResults] = useState<SearchResultTransaction[]>([]);
  const requestSeqRef = useRef(0);
  const { currencySymbol, locale } = useCurrencyLocale();

  const formatAmount = useCallback(
    (amount: number) =>
      `${currencySymbol}${Math.abs(amount).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [currencySymbol, locale]
  );

  useEffect(() => {
    if (!isOpen) return;
    requestSeqRef.current += 1;
    setQuery("");
    setActiveCategory("all");
    setAiResult(null);
    setTransactionResults([]);
    setIsSearchingTransactions(false);
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !onSearchTransactions) {
      requestSeqRef.current += 1;
      setTransactionResults([]);
      setIsSearchingTransactions(false);
      return;
    }
    if (activeCategory !== "all" && activeCategory !== "transactions") return;

    const seq = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      setIsSearchingTransactions(true);
      try {
        const res = await onSearchTransactions(trimmedQuery);
        if (requestSeqRef.current === seq) setTransactionResults(res);
      } catch {
        if (requestSeqRef.current === seq) setTransactionResults([]);
      } finally {
        if (requestSeqRef.current === seq) setIsSearchingTransactions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, activeCategory, onSearchTransactions]);

  const trimmed = query.trim().toLowerCase();

  const filteredPages = useMemo(
    () => (activeCategory === "all" ? filterPagesByQuery(pages, trimmed) : []),
    [pages, trimmed, activeCategory]
  );

  const filteredAccounts = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "accounts") return [];
    if (!trimmed) return accounts.slice(0, 5);
    return accounts.filter((a) => a.name.toLowerCase().includes(trimmed) || Boolean(a.type?.toLowerCase().includes(trimmed)));
  }, [accounts, trimmed, activeCategory]);

  const filteredEnvelopes = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "envelopes") return [];
    if (!trimmed) return envelopes.slice(0, 5);
    return envelopes.filter((e) => e.name.toLowerCase().includes(trimmed) || Boolean(e.type?.toLowerCase().includes(trimmed)));
  }, [envelopes, trimmed, activeCategory]);

  const filteredEvents = useMemo(() => {
    if (activeCategory !== "all" && activeCategory !== "events") return [];
    if (!trimmed) return upcomingEvents.slice(0, 5);
    return upcomingEvents.filter((ev) => ev.name.toLowerCase().includes(trimmed) || ev.type.toLowerCase().includes(trimmed));
  }, [upcomingEvents, trimmed, activeCategory]);

  const filteredTransactions = useMemo(
    () => (activeCategory !== "all" && activeCategory !== "transactions" ? [] : transactionResults),
    [transactionResults, activeCategory]
  );

  const totalMatchCount =
    filteredPages.length +
    filteredAccounts.length +
    filteredEnvelopes.length +
    filteredEvents.length +
    filteredTransactions.length;

  const shouldPrioritizeAi = Boolean(
    hasAiAssistant && onAskPenny && shouldPrioritizeAskPenny(query.trim(), totalMatchCount)
  );

  const handleExecuteAi = useCallback(
    async (textToAsk: string) => {
      if (!hasAiAssistant || !onAskPenny || isAiLoading) return;
      const q = textToAsk.trim();
      if (!q) return;
      setQuery(q);
      setIsAiLoading(true);
      setAiResult(null);
      try {
        const res = await onAskPenny(q);
        setAiResult(res);
        if (res.type === "prefill" && onNavigatePrefill) {
          onClose();
          onNavigatePrefill(res);
        }
      } catch (err) {
        setAiResult(mapTrpcAssistantError(err));
      } finally {
        setIsAiLoading(false);
      }
    },
    [hasAiAssistant, onAskPenny, isAiLoading, onNavigatePrefill, onClose]
  );

  return {
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    isAiLoading,
    aiResult,
    setAiResult,
    isSearchingTransactions,
    trimmed,
    filteredPages,
    filteredAccounts,
    filteredEnvelopes,
    filteredEvents,
    filteredTransactions,
    shouldPrioritizeAi,
    handleExecuteAi,
    formatAmount,
    locale,
  };
}
