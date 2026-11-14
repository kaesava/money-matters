"use client";

import React, { useCallback, useEffect } from "react";
import { t } from "@money-matters/i18n";
import type { SearchResultPage } from "@money-matters/ui/web";
import { trpc } from "../../../lib/trpc";

interface UseDashboardSearchAndShortcutsProps {
  bankAccountsData?: Array<{ id: string; name: string; accountType: string; expectedBalance: string }>;
  envelopesData?: Array<{ id: string; name: string; envelopeType: string; currentBalance: number }>;
  incomeEventsData?: Array<{ id: string; name: string; expectedAmount: string; expectedDate: string; status?: string }>;
  expenseEventsData?: Array<{ id: string; name: string; expectedAmount: string; expectedDate: string; status?: string }>;
  hasSimulation?: boolean;
  hasReports?: boolean;
  setAskPennyOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickExpenseOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function buildWebSearchPages(hasSimulation: boolean, hasReports: boolean): SearchResultPage[] {
  const pages: SearchResultPage[] = [
    { id: "home", title: t("commandPalette.pages.home"), subtitle: t("commandPalette.pages.homeSub"), route: "/dashboard", keywords: ["overview", "summary", "payday"] },
    { id: "envelopes", title: t("commandPalette.pages.envelopes"), subtitle: t("commandPalette.pages.envelopesSub"), route: "/dashboard/envelopes", keywords: ["categories", "bills", "goals", "everyday"] },
    { id: "plan", title: t("commandPalette.pages.plan"), subtitle: t("commandPalette.pages.planSub"), route: "/dashboard/plan", keywords: ["timeline", "upcoming", "events", "bills", "income"] },
    { id: "schedules", title: t("commandPalette.pages.schedules"), subtitle: t("commandPalette.pages.schedulesSub"), route: "/dashboard/plan?tab=streams", keywords: ["recurring", "payday", "income schedule"] },
    { id: "projection", title: t("commandPalette.pages.projection"), subtitle: t("commandPalette.pages.projectionSub"), route: "/dashboard/projection", keywords: ["forecast", "12 month", "future"] },
    { id: "history", title: t("commandPalette.pages.history"), subtitle: t("commandPalette.pages.historySub"), route: "/dashboard/history", keywords: ["transactions", "allocations", "spent"] },
    { id: "bank-accounts", title: t("commandPalette.pages.bankAccounts"), subtitle: t("commandPalette.pages.bankAccountsSub"), route: "/dashboard/bank-accounts", keywords: ["accounts", "balance", "match balance", "bank"] },
    { id: "settings", title: t("commandPalette.pages.settings"), subtitle: t("commandPalette.pages.settingsSub"), route: "/dashboard/settings", keywords: ["profile", "household", "subscription", "preferences"] },
    { id: "quick-expense", title: t("commandPalette.pages.quickExpense"), subtitle: t("commandPalette.pages.quickExpenseSub"), route: "#quick-expense", keywords: ["expense", "income", "transfer", "log", "move money"], isAction: true },
  ];
  if (hasSimulation) {
    pages.splice(4, 0, {
      id: "afford-check",
      title: t("commandPalette.pages.affordCheck"),
      subtitle: t("commandPalette.pages.affordCheckSub"),
      route: "/dashboard/afford-check",
      keywords: ["afford", "simulate", "purchase"],
    });
  }
  if (hasReports) {
    pages.splice(pages.length - 2, 0, {
      id: "reports",
      title: t("commandPalette.pages.reports"),
      subtitle: t("commandPalette.pages.reportsSub"),
      route: "/dashboard/reports",
      keywords: ["analytics", "spending", "charts"],
    });
  }
  return pages;
}

/**
 * Prepares Command Palette search indices and binds global dashboard keyboard shortcuts.
 */
export function useDashboardSearchAndShortcuts({
  bankAccountsData,
  envelopesData,
  incomeEventsData,
  expenseEventsData,
  hasSimulation = true,
  hasReports = true,
  setAskPennyOpen,
  setShowShortcutsModal,
  setQuickExpenseOpen,
}: UseDashboardSearchAndShortcutsProps) {
  const utils = trpc.useUtils();

  const searchPages = React.useMemo(
    () => buildWebSearchPages(hasSimulation, hasReports),
    [hasSimulation, hasReports]
  );

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
    const incomes = (incomeEventsData ?? [])
      .filter((ev) => !ev.status || ev.status === "PENDING")
      .map((ev) => ({
        id: ev.id,
        name: ev.name,
        amount: parseFloat(ev.expectedAmount),
        dueDate: ev.expectedDate,
        type: "INCOME" as const,
      }));
    const expenses = (expenseEventsData ?? [])
      .filter((ev) => !ev.status || ev.status === "PENDING")
      .map((ev) => ({
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
        else setAskPennyOpen(true);
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

  return { searchPages, searchAccounts, searchEnvelopes, searchEvents, handleSearchTransactions };
}
