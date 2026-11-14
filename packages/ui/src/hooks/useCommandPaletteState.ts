import { useState, useEffect, useMemo, useCallback } from "react";
import type { AssistantResult } from "@money-matters/types";
import { useCurrencyLocale } from "./CurrencyLocaleContext";

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

export function useCommandPaletteState({
  isOpen,
  onClose,
  accounts = [],
  envelopes = [],
  upcomingEvents = [],
  onSearchTransactions,
  onAskPenny,
  onNavigatePrefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts?: SearchResultAccount[];
  envelopes?: SearchResultEnvelope[];
  upcomingEvents?: SearchResultEvent[];
  onSearchTransactions?: (query: string) => Promise<SearchResultTransaction[]>;
  onAskPenny?: (query: string) => Promise<AssistantResult>;
  onNavigatePrefill?: (result: Extract<AssistantResult, { type: "prefill" }>) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommandPaletteCategory>("all");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AssistantResult | null>(null);
  const [isSearchingTransactions, setIsSearchingTransactions] = useState(false);
  const [transactionResults, setTransactionResults] = useState<SearchResultTransaction[]>([]);
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
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setAiResult(null);
      setTransactionResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !onSearchTransactions) {
      setTransactionResults([]);
      setIsSearchingTransactions(false);
      return;
    }
    if (activeCategory !== "all" && activeCategory !== "transactions") return;

    const timer = setTimeout(async () => {
      setIsSearchingTransactions(true);
      try {
        setTransactionResults(await onSearchTransactions(trimmedQuery));
      } catch {
        setTransactionResults([]);
      } finally {
        setIsSearchingTransactions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, activeCategory, onSearchTransactions]);

  const trimmed = query.trim().toLowerCase();

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
    filteredAccounts,
    filteredEnvelopes,
    filteredEvents,
    filteredTransactions,
    handleExecuteAi,
    formatAmount,
    locale,
  };
}
