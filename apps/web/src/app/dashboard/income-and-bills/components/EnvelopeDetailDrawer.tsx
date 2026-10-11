"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Tabs } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { CategorySummaryItem } from "../../envelopes/types";

export interface CategoryScheduledEvent {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  isPaid?: boolean;
}

export interface EnvelopeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId?: string;
  events?: CategoryScheduledEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
  onEditPool?: (pool: CategorySummaryItem) => void;
}

export type SlideOverCategoryDrawerProps = EnvelopeDetailDrawerProps;

export function EnvelopeDetailDrawer({
  isOpen,
  onClose,
  categoryName,
  categoryId,
  events,
  onMarkPaid,
  onEditPool,
}: EnvelopeDetailDrawerProps) {
  const { fmtDate } = useLocale();
  const [activeTab, setActiveTab] = useState<"expenses" | "activity">("expenses");

  // Fetch pool, categories, transactions, and fallback upcoming events
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 200, offset: 0 }, { enabled: isOpen });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: isOpen && !events });

  // Find target pool by ID or Name
  const targetPool = useMemo(() => {
    if (!poolsQuery.data) return null;
    return poolsQuery.data.find(
      (p) => (categoryId && p.id === categoryId) || p.name.toLowerCase() === categoryName.toLowerCase()
    );
  }, [poolsQuery.data, categoryId, categoryName]);

  // Calculate effective monthly target amount for envelope
  const targetAmt = useMemo(() => {
    if (!targetPool) return null;
    return targetPool.monthlyAmount
      ? parseFloat(String(targetPool.monthlyAmount))
      : targetPool.targetAmount
      ? parseFloat(String(targetPool.targetAmount))
      : null;
  }, [targetPool]);

  // Related transactions
  const relatedTransactions = useMemo(() => {
    if (!transactionsQuery.data || !targetPool) return [];
    return transactionsQuery.data.filter(
      (tx) => tx.envelopeId === targetPool.id || (tx as unknown as { poolId?: string }).poolId === targetPool.id
    );
  }, [transactionsQuery.data, targetPool]);

  const effectiveEvents = useMemo(() => {
    if (events) return events;
    if (!expenseEventsQuery.data || !targetPool) return [];
    return expenseEventsQuery.data
      .filter((e) => e.status !== "CONFIRMED" && e.envelopeId === targetPool.id)
      .map((e) => ({
        id: e.id,
        name: e.name || "Expense",
        amount: e.expectedAmount,
        dueDate: e.expectedDate,
        isPaid: e.status === "CONFIRMED",
      }));
  }, [events, expenseEventsQuery.data, targetPool]);

  // Upcoming Expenses limited to 5 latest
  const upcomingExpensesList = useMemo(() => {
    return [...effectiveEvents]
      .sort((a, b) => new Date(b.dueDate + "T00:00:00").getTime() - new Date(a.dueDate + "T00:00:00").getTime())
      .slice(0, 5);
  }, [effectiveEvents]);

  // History Transactions limited to 5 latest
  const historyTransactionsList = useMemo(() => {
    return [...relatedTransactions]
      .sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime())
      .slice(0, 5);
  }, [relatedTransactions]);

  // ESC key dismissal (AGENTS.md Rule 13)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentBal = targetPool ? parseFloat(String(targetPool.currentBalance || "0")) : 0;
  const isGoalPool = targetPool?.envelopeType === "TARGET_GOAL" || targetPool?.envelopeType === "ONGOING_GOAL";

  const resolvedTabs = [
    { id: "expenses" as const, label: `${t("categoryDrawer.tabs.upcomingExpenses")} (${effectiveEvents.length})` },
    { id: "activity" as const, label: `${t("categoryDrawer.tabs.history")} (${relatedTransactions.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-black text-[#1B2B4B] dark:text-white">
                    {categoryName}
                  </span>
                  {targetPool && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {targetPool.envelopeType}
                    </span>
                  )}
                  {onEditPool && targetPool && (
                    <button
                      type="button"
                      onClick={() => {
                        onEditPool({
                          id: targetPool.id,
                          name: targetPool.name,
                          envelopeType: targetPool.envelopeType,
                          type: targetPool.envelopeType,
                          poolType: targetPool.envelopeType,
                          currentBalance: String(targetPool.currentBalance ?? "0.00"),
                          bankAccountId: targetPool.bankAccountId,
                          bankAccountName: targetPool.bankAccountName,
                          isPrivate: targetPool.isPrivate,
                          targetAmount: targetPool.targetAmount ? String(targetPool.targetAmount) : null,
                          isSurplusTarget: targetPool.isSurplusTarget,
                        });
                      }}
                      className="px-2 py-0.5 text-xs font-bold text-[#2563eb] hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* High-Level Read-Only Pool Details Cards — 2 Rows Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              {/* Row 1, Col 1: Current Balance */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t("categoryDrawer.currentBalance")}
                </span>
                <span className="text-sm font-black font-mono text-[#1B2B4B] dark:text-white">
                  ${currentBal.toFixed(2)}
                </span>
              </div>

              {/* Row 1, Col 2: Target Amount */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t("categoryDrawer.targetAmount")}
                </span>
                <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
                  {targetAmt ? `$${targetAmt.toFixed(2)}${!isGoalPool ? ` ${t("categoryDrawer.perMonth")}` : ""}` : "—"}
                </span>
              </div>

              {/* Row 2, Col 1: Pool Type / Target Date */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {isGoalPool ? t("categoryDrawer.targetDate") : t("categoryDrawer.poolType")}
                </span>
                <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
                  {isGoalPool
                    ? targetPool?.endDate
                      ? fmtDate(targetPool.endDate)
                      : "—"
                    : targetPool?.envelopeType ?? "—"}
                </span>
              </div>

              {/* Row 2, Col 2: Linked Bank Account */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t("categoryDrawer.linkedBankAccount")}
                </span>
                {targetPool?.bankAccountName ? (
                  <Link
                    href={targetPool.bankAccountId ? `/dashboard/settings?tab=bank-accounts&id=${targetPool.bankAccountId}` : `/dashboard/settings?tab=bank-accounts`}
                    onClick={onClose}
                    className="text-sm font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1 truncate max-w-full"
                  >
                    <span className="truncate">{targetPool.bankAccountName}</span>
                    <span className="text-xs">↗</span>
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-zinc-400">—</span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs
              tabs={resolvedTabs}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as "expenses" | "activity")}
            />
          </div>

          {/* Drawer Body — Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab 1: Upcoming Expenses Table */}
            {activeTab === "expenses" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Link
                    href={`/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE&poolId=${targetPool?.id || ""}`}
                    onClick={onClose}
                    className="text-xs font-bold text-[#2563eb] hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    <span>{t("categoryDrawer.seeAllUpcomingExpenses")}</span>
                    <span>→</span>
                  </Link>
                </div>

                {upcomingExpensesList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                    {t("categoryDrawer.noExpenses")}
                  </div>
                ) : (
                  <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                          <th className="p-3">{t("categoryDrawer.expenseName")}</th>
                          <th className="p-3 text-center">{t("categoryDrawer.dueDate")}</th>
                          <th className="p-3 text-right">{t("categoryDrawer.amount")}</th>
                          <th className="p-3 text-center">{t("categoryDrawer.status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {upcomingExpensesList.map((evt) => (
                          <tr key={evt.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                              {evt.name}
                            </td>
                            <td className="p-3 text-center font-mono text-zinc-500">
                              {evt.dueDate}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[#1B2B4B] dark:text-white">
                              ${parseFloat(evt.amount || "0").toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              {evt.isPaid ? (
                                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md inline-block">
                                  {t("categoryDrawer.confirmed")}
                                </span>
                              ) : onMarkPaid ? (
                                <button
                                  type="button"
                                  onClick={() => onMarkPaid(evt.id, evt.amount, evt.dueDate)}
                                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-[#2563eb] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  {t("categoryDrawer.markPaid")}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block">
                                  {t("categoryDrawer.pending")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: History Table */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Link
                    href={`/dashboard/history?poolId=${targetPool?.id || ""}`}
                    onClick={onClose}
                    className="text-xs font-bold text-[#2563eb] hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    <span>{t("categoryDrawer.seeFullHistory")}</span>
                    <span>→</span>
                  </Link>
                </div>

                {historyTransactionsList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                    {t("categoryDrawer.noTransactions")}
                  </div>
                ) : (
                  <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                          <th className="p-3 text-center">{t("categoryDrawer.date")}</th>
                          <th className="p-3">{t("categoryDrawer.description")}</th>
                          <th className="p-3 text-center">{t("categoryDrawer.type")}</th>
                          <th className="p-3 text-right">{t("categoryDrawer.amount")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {historyTransactionsList.map((tx) => {
                          const noteText = tx.note || (tx as unknown as { envelopeName?: string }).envelopeName || t("categoryDrawer.transactionFallback");
                          const isDebit = tx.flowType === "DEBIT";

                          return (
                            <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-mono text-zinc-500 text-[11px] text-center">
                                {tx.recordedAt ? fmtDate(tx.recordedAt) : "—"}
                              </td>
                              <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100 max-w-[180px] truncate">
                                {noteText}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  isDebit ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                                }`}>
                                  {tx.flowType}
                                </span>
                              </td>
                              <td className={`p-3 text-right font-mono font-bold ${
                                isDebit ? "text-rose-600" : "text-emerald-600"
                              }`}>
                                {isDebit ? "-" : "+"}${parseFloat(String(tx.amount || "0")).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SlideOverCategoryDrawer = EnvelopeDetailDrawer;
