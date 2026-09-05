"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Tabs } from "@money-matters/ui/web";

export interface CategoryScheduledEvent {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  isPaid?: boolean;
}

interface SlideOverCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId?: string;
  events: CategoryScheduledEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
}

export function SlideOverCategoryDrawer({
  isOpen,
  onClose,
  categoryName,
  categoryId,
  events,
  onMarkPaid,
}: SlideOverCategoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "expenses" | "activity">("categories");

  // Fetch pool, categories, and transactions
  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: isOpen });
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: isOpen });
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 200, offset: 0 }, { enabled: isOpen });

  // Find target pool by ID or Name
  const targetPool = useMemo(() => {
    if (!poolsQuery.data) return null;
    return poolsQuery.data.find(
      (p) => (categoryId && p.id === categoryId) || p.name.toLowerCase() === categoryName.toLowerCase()
    );
  }, [poolsQuery.data, categoryId, categoryName]);

  // Sub-categories belonging to target pool
  const relatedCategories = useMemo(() => {
    if (!categoriesQuery.data || !targetPool) return [];
    return categoriesQuery.data.filter((c) => c.poolId === targetPool.id);
  }, [categoriesQuery.data, targetPool]);

  // Related transactions
  const relatedTransactions = useMemo(() => {
    if (!transactionsQuery.data || !targetPool) return [];
    const poolCategoryIds = new Set(relatedCategories.map((c) => c.id));
    return transactionsQuery.data.filter(
      (tx) => tx.poolId === targetPool.id || (tx.categoryId && poolCategoryIds.has(tx.categoryId))
    );
  }, [transactionsQuery.data, targetPool, relatedCategories]);

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
  const targetAmt = targetPool?.targetAmount ? parseFloat(String(targetPool.targetAmount)) : null;

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
                  <Link
                    href={`/dashboard/pools?search=${encodeURIComponent(categoryName)}`}
                    onClick={onClose}
                    className="text-xl font-black text-[#2563eb] hover:underline transition-colors flex items-center gap-1.5"
                    title="View in Pools screen"
                  >
                    <span>{categoryName}</span>
                    <span className="text-xs font-normal text-zinc-400">↗</span>
                  </Link>
                  {targetPool && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {targetPool.poolType}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <Link
                    href={`/dashboard/history?search=${encodeURIComponent(categoryName)}`}
                    onClick={onClose}
                    className="text-xs font-bold text-zinc-500 hover:text-[#2563eb] hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    <span>{t("categoryDrawer.historyLink", { defaultValue: "View History" })}</span>
                    <span>→</span>
                  </Link>
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

            {/* High-Level Read-Only Pool Details Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Current Balance
                </span>
                <span className="text-sm font-black font-mono text-[#1B2B4B] dark:text-white">
                  ${currentBal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Target Amount
                </span>
                <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
                  {targetAmt ? `$${targetAmt.toFixed(2)}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Sub-Categories
                </span>
                <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
                  {relatedCategories.length}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs
              tabs={[
                { id: "categories", label: `${t("categoryDrawer.tabs.categories", { defaultValue: "Categories" })} (${relatedCategories.length})` },
                { id: "expenses", label: `${t("categoryDrawer.tabs.relatedExpenses", { defaultValue: "Related Expenses" })} (${events.length})` },
                { id: "activity", label: `${t("categoryDrawer.tabs.recentActivity", { defaultValue: "Recent Activity" })} (${relatedTransactions.length})` },
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as "categories" | "expenses" | "activity")}
            />
          </div>

          {/* Drawer Body — Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab 1: Categories Table */}
            {activeTab === "categories" && (
              <div className="space-y-4">
                {relatedCategories.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                    {t("categoryDrawer.noCategories", { defaultValue: "No sub-categories found for this pool." })}
                  </div>
                ) : (
                  <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                          <th className="p-3">Category Name</th>
                          <th className="p-3 text-right">Target / Budget</th>
                          <th className="p-3 text-center">Frequency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {relatedCategories.map((cat) => {
                          const budgetAmt = cat.enteredAmount
                            ? parseFloat(cat.enteredAmount)
                            : cat.monthlyAmount
                            ? parseFloat(cat.monthlyAmount)
                            : null;

                          return (
                            <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                                {cat.name}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                {budgetAmt !== null ? `$${budgetAmt.toFixed(2)}` : "—"}
                              </td>
                              <td className="p-3 text-center font-medium text-zinc-500">
                                {cat.budgetFrequency || "Monthly"}
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

            {/* Tab 2: Related Expenses Table */}
            {activeTab === "expenses" && (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                    {t("categoryDrawer.noExpenses", { defaultValue: "No scheduled expense events found for this pool." })}
                  </div>
                ) : (
                  <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                          <th className="p-3">Expense Name</th>
                          <th className="p-3 text-center">Due Date</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {events.map((evt) => (
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
                                  CONFIRMED
                                </span>
                              ) : onMarkPaid ? (
                                <button
                                  type="button"
                                  onClick={() => onMarkPaid(evt.id, evt.amount, evt.dueDate)}
                                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-[#2563eb] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block">
                                  PENDING
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

            {/* Tab 3: Recent Activity Table */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                {relatedTransactions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                    {t("categoryDrawer.noTransactions", { defaultValue: "No recent activity found for this pool." })}
                  </div>
                ) : (
                  <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                          <th className="p-3">Date</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">Type</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {relatedTransactions.map((tx) => {
                          const noteText = tx.note || tx.categoryName || tx.poolName || "Transaction";
                          const isDebit = tx.flowType === "DEBIT";

                          return (
                            <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3 font-mono text-zinc-500 text-[11px]">
                                {tx.recordedAt ? String(tx.recordedAt).split("T")[0] : "—"}
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
