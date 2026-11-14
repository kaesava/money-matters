"use client";

import React, { useCallback, useEffect } from "react";
import { trpc } from "../../../lib/trpc";

interface UseDashboardSearchAndShortcutsProps {
  bankAccountsData?: Array<{ id: string; name: string; accountType: string; expectedBalance: string }>;
  envelopesData?: Array<{ id: string; name: string; envelopeType: string; currentBalance: number }>;
  incomeEventsData?: Array<{ id: string; name: string; expectedAmount: string; expectedDate: string }>;
  expenseEventsData?: Array<{ id: string; name: string; expectedAmount: string; expectedDate: string }>;
  setAskPennyOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickExpenseOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Prepares Command Palette search indices and binds global dashboard keyboard shortcuts.
 */
export function useDashboardSearchAndShortcuts({
  bankAccountsData,
  envelopesData,
  incomeEventsData,
  expenseEventsData,
  setAskPennyOpen,
  setShowShortcutsModal,
  setQuickExpenseOpen,
}: UseDashboardSearchAndShortcutsProps) {
  const utils = trpc.useUtils();

  const searchAccounts = React.useMemo(
    () =>
      (bankAccountsData ?? []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.accountType,
        currentBalance: parseFloat(acc.expectedBalance),
      })),
    [bankAccountsData]
  );

  const searchEnvelopes = React.useMemo(
    () =>
      (envelopesData ?? []).map((env) => ({
        id: env.id,
        name: env.name,
        type: env.envelopeType,
        currentBalance: env.currentBalance,
      })),
    [envelopesData]
  );

  const searchEvents = React.useMemo(() => {
    const incomes = (incomeEventsData ?? []).map((ev) => ({
      id: ev.id,
      name: ev.name,
      amount: parseFloat(ev.expectedAmount),
      dueDate: ev.expectedDate,
      type: "INCOME" as const,
    }));
    const expenses = (expenseEventsData ?? []).map((ev) => ({
      id: ev.id,
      name: ev.name,
      amount: parseFloat(ev.expectedAmount),
      dueDate: ev.expectedDate,
      type: "EXPENSE" as const,
    }));
    return [...incomes, ...expenses];
  }, [incomeEventsData, expenseEventsData]);

  const handleSearchTransactions = useCallback(
    async (q: string) => {
      const res = await utils.searchTransactions.fetch({ query: q, limit: 10 });
      return res.map((tx) => ({
        id: tx.id,
        recordedAt: tx.recordedAt,
        amount: parseFloat(tx.amount),
        note: tx.note,
        flowType: tx.flowType,
        envelopeName: tx.envelopeName,
        envelopeId: tx.envelopeId,
        bankAccountId: tx.bankAccountId,
      }));
    },
    [utils]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (e.key === "Escape") (document.activeElement as HTMLElement).blur();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAskPennyOpen((prev) => !prev);
      } else if (e.key === "?") {
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowShortcutsModal(false);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickExpenseOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput =
          document.querySelector<HTMLInputElement>("[data-search-input]") ||
          document.querySelector<HTMLInputElement>('input[type="search"]') ||
          document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) searchInput.focus();
      }
    };

    const handleOpenAskPenny = () => setAskPennyOpen(true);
    window.addEventListener("open-ask-penny", handleOpenAskPenny);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-ask-penny", handleOpenAskPenny);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setAskPennyOpen, setShowShortcutsModal, setQuickExpenseOpen]);

  return { searchAccounts, searchEnvelopes, searchEvents, handleSearchTransactions };
}
