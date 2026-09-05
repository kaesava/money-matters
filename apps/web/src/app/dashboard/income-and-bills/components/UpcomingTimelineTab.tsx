"use client";

import React, { useState, useMemo, useEffect } from "react";
import { EventItem } from "./BurstModal";
import { InsufficientFundsModal } from "./InsufficientFundsModal";
import {
  PaginationBar,
  SearchInput,
  SkeletonTable,
  ResizableTh,
  useResizableColumns,
  ConfirmDialog,
} from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { getTenantDateString } from "@money-matters/core";

export interface TimelineEventItem extends EventItem {
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
  isSkipped?: boolean;
  isPrivate?: boolean;
}

interface UpcomingTimelineTabProps {
  isLoading?: boolean;
  incomeEvents: TimelineEventItem[];
  expenseEvents: TimelineEventItem[];
  transferEvents: TimelineEventItem[];
  categories: {
    id: string;
    name: string;
    currentBalance: string | number;
  }[];
  initialKindFilter?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  onAllocateIncome: (eventId: string) => void;
  onMarkExpensePaid: (eventId: string, amount: string, date: string) => void;
  onSkipIncome: (eventId: string) => void;
  onSkipExpense: (eventId: string) => void;
  onSkipTransfer?: (eventId: string) => void;
  onExecuteTransfer?: (
    eventId: string,
    amount: string,
    date: string,
    sourcePoolId?: string,
    destinationPoolId?: string
  ) => void;
  onConfirmTransferAndPay: (fundingCategoryId: string, destCategoryId: string, amountStr: string) => Promise<void>;
  onOpenTransferModalWithData?: (data: {
    sourcePoolId?: string;
    destinationPoolId?: string;
    amount: string;
    date: string;
  }) => void;
}

export function UpcomingTimelineTab({
  isLoading = false,
  incomeEvents,
  expenseEvents,
  transferEvents,
  categories,
  initialKindFilter = "ALL",
  onAllocateIncome,
  onMarkExpensePaid,
  onSkipIncome,
  onSkipExpense,
  onSkipTransfer,
  onExecuteTransfer,
  onConfirmTransferAndPay,
  onOpenTransferModalWithData,
}: UpcomingTimelineTabProps) {
  const todayStr = useMemo(() => getTenantDateString(new Date()), []);

  // Filter States
  const [kindFilter, setKindFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">(initialKindFilter);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort State
  const [sortField, setSortField] = useState<"date" | "name" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { widths, onMouseDown } = useResizableColumns({
    date: 150,
    name: 280,
    amount: 140,
    actions: 180,
  });

  const [eventToSkip, setEventToSkip] = useState<{ id: string; kind: "INCOME" | "EXPENSE" | "TRANSFER" } | null>(null);

  const [insufficientModalState, setInsufficientModalState] = useState<{
    isOpen: boolean;
    eventId: string;
    billName: string;
    amount: string;
    date: string;
    shortfall: number;
    destinationCategoryId: string;
  }>({
    isOpen: false,
    eventId: "",
    billName: "",
    amount: "0.00",
    date: "",
    shortfall: 0,
    destinationCategoryId: "",
  });

  const handleSort = (field: "date" | "name" | "amount") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Combine, filter & sort events
  const filteredTimeline = useMemo(() => {
    const all = [
      ...incomeEvents.map((e) => ({ ...e, eventKind: "INCOME" as const })),
      ...expenseEvents.map((e) => ({ ...e, eventKind: "EXPENSE" as const })),
      ...transferEvents.map((e) => ({ ...e, eventKind: "TRANSFER" as const })),
    ];

    return all
      .filter((e) => {
        // 1. Kind filter
        if (kindFilter !== "ALL" && e.eventKind !== kindFilter) return false;

        // 2. Scope filter (Shared / Private)
        if (scopeFilter === "PRIVATE" && !e.isPrivate) return false;
        if (scopeFilter === "SHARED" && e.isPrivate) return false;

        // 3. Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const amtStr = String(e.expectedAmount || "");
        return (
          (e.name || "").toLowerCase().includes(q) ||
          (e.note || "").toLowerCase().includes(q) ||
          (e.categoryName || "").toLowerCase().includes(q) ||
          (e.accountName || "").toLowerCase().includes(q) ||
          (e.sourcePoolName || "").toLowerCase().includes(q) ||
          (e.destinationPoolName || "").toLowerCase().includes(q) ||
          amtStr.includes(q)
        );
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "date") {
          comp = new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
        } else if (sortField === "name") {
          comp = (a.name || "").localeCompare(b.name || "");
        } else if (sortField === "amount") {
          comp = parseFloat(a.expectedAmount || "0") - parseFloat(b.expectedAmount || "0");
        }
        return sortOrder === "asc" ? comp : -comp;
      });
  }, [incomeEvents, expenseEvents, transferEvents, kindFilter, scopeFilter, searchQuery, sortField, sortOrder]);


  useEffect(() => {
    setPage(1);
  }, [kindFilter, scopeFilter, searchQuery]);

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTimeline.slice(start, start + pageSize);
  }, [filteredTimeline, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTimeline.length / pageSize));

  const handleExpenseMarkPaidClick = (evt: TimelineEventItem) => {
    const amt = parseFloat(evt.expectedAmount || "0");
    const cat = categories.find((c) => c.id === evt.categoryId);
    const currBalance = typeof cat?.currentBalance === "string" ? parseFloat(cat.currentBalance || "0") : (cat?.currentBalance ?? 0);

    if (amt > currBalance) {
      const shortfall = amt - currBalance;
      setInsufficientModalState({
        isOpen: true,
        eventId: evt.id,
        billName: evt.name || "Bill",
        amount: evt.expectedAmount,
        date: evt.expectedDate,
        shortfall,
        destinationCategoryId: evt.categoryId || "",
      });
    } else {
      onMarkExpensePaid(evt.id, evt.expectedAmount, evt.expectedDate);
    }
  };

  const handleTransferClick = async (evt: TimelineEventItem) => {
    const amt = parseFloat(evt.expectedAmount || "0");
    const srcCat = categories.find((c) => c.id === evt.sourcePoolId);
    const srcBalance = typeof srcCat?.currentBalance === "string" ? parseFloat(srcCat.currentBalance || "0") : (srcCat?.currentBalance ?? 0);

    if (amt > srcBalance) {
      if (onOpenTransferModalWithData) {
        onOpenTransferModalWithData({
          sourcePoolId: evt.sourcePoolId || undefined,
          destinationPoolId: evt.destinationPoolId || undefined,
          amount: evt.expectedAmount,
          date: evt.expectedDate,
        });
      }
    } else {
      if (onExecuteTransfer) {
        await onExecuteTransfer(
          evt.id,
          evt.expectedAmount,
          evt.expectedDate,
          evt.sourcePoolId || undefined,
          evt.destinationPoolId || undefined
        );
      }
    }
  };

  const handleConfirmShortfallTransfer = async (fundingCategoryId: string) => {
    await onConfirmTransferAndPay(
      fundingCategoryId,
      insufficientModalState.destinationCategoryId,
      insufficientModalState.shortfall.toFixed(2)
    );
    onMarkExpensePaid(
      insufficientModalState.eventId,
      insufficientModalState.amount,
      insufficientModalState.date
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Controls Bar: Search, Kind Filter, Scope Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="w-full md:w-80 flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search events, pools, accounts, amount..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Filter Pills: All | Shared | Private */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScopeFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter("SHARED")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === "SHARED"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Shared
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter("PRIVATE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === "PRIVATE"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Private
            </button>
          </div>

          {/* Kind Filter Pills: All | Income | Expense | Transfer */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setKindFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                kindFilter === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("INCOME")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                kindFilter === "INCOME"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("EXPENSE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                kindFilter === "EXPENSE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("TRANSFER")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                kindFilter === "TRANSFER"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Standardized Table View */}
      {isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filteredTimeline.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500">
            No upcoming events found matching your search or filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">
                  <ResizableTh
                    width={widths.date}
                    onResizeMouseDown={(e) => onMouseDown("date", e)}
                    className="py-3 px-4 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold"
                    >
                      <span>Date</span>
                      {sortField === "date" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </ResizableTh>

                  <ResizableTh
                    width={widths.name}
                    onResizeMouseDown={(e) => onMouseDown("name", e)}
                    className="py-3 px-4 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold"
                    >
                      <span>Name</span>
                      {sortField === "name" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </ResizableTh>

                  <ResizableTh
                    width={widths.amount}
                    onResizeMouseDown={(e) => onMouseDown("amount", e)}
                    className="py-3 px-4 text-right"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("amount")}
                      className="flex items-center gap-1 justify-end hover:text-zinc-700 dark:hover:text-zinc-200 font-bold w-full"
                    >
                      <span>Amount</span>
                      {sortField === "amount" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </ResizableTh>

                  <ResizableTh
                    width={widths.actions}
                    onResizeMouseDown={(e) => onMouseDown("actions", e)}
                    className="py-3 px-4 text-center"
                  >
                    <span>Actions</span>
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {paginatedEvents.map((evt) => {
                  const isIncome = evt.eventKind === "INCOME";
                  const isTransfer = evt.eventKind === "TRANSFER";
                  const isSkipped = evt.status === "SKIPPED" || evt.isSkipped;

                  // Past Date calculation
                  const isPast = evt.expectedDate < todayStr;
                  const dateObj = new Date(evt.expectedDate + "T00:00:00");
                  const formattedDate = new Intl.DateTimeFormat("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "Australia/Sydney",
                  }).format(dateObj);

                  return (
                    <tr
                      key={`${evt.eventKind}_${evt.id}`}
                      className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors ${
                        isSkipped ? "opacity-50 bg-zinc-50/50 dark:bg-zinc-900/40" : ""
                      }`}
                    >
                      {/* Date Column */}
                      <td className="py-3 px-4 text-left font-mono font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={
                              isPast
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-zinc-700 dark:text-zinc-300"
                            }
                          >
                            {formattedDate}
                          </span>
                          {isPast && !isSkipped && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name Column with Badges */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {evt.name ||
                                (isIncome
                                  ? "Income Deposit"
                                  : isTransfer
                                  ? "Pool Transfer"
                                  : "Scheduled Expense")}
                            </span>

                            {/* Badge: Bank Account for Income, Pool Name for Expense */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isIncome
                                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                  : isTransfer
                                  ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"
                                  : "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {isIncome
                                ? evt.accountName || "Bank Account"
                                : isTransfer
                                ? `${evt.sourcePoolName || "Source"} ➔ ${evt.destinationPoolName || "Destination"}`
                                : evt.categoryName || "Pool"}
                            </span>

                            {isSkipped && (
                              <span className="text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                SKIPPED
                              </span>
                            )}
                          </div>

                          {evt.note && (
                            <span className="text-[11px] text-zinc-400 italic">
                              {evt.note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount Column */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums">
                        <span
                          className={
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isTransfer
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-[#1B2B4B] dark:text-white"
                          }
                        >
                          {isIncome ? "+" : isTransfer ? "↔" : "-"}$
                          {parseFloat(evt.expectedAmount || "0").toFixed(2)}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEventToSkip({
                                id: evt.id,
                                kind: isIncome ? "INCOME" : isTransfer ? "TRANSFER" : "EXPENSE",
                              })
                            }
                            className="px-2 py-1 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 font-semibold text-xs rounded-lg transition-colors"
                            title="Skip this occurrence"
                          >
                            Skip
                          </button>

                          {isIncome ? (
                            <button
                              type="button"
                              onClick={() => onAllocateIncome(evt.id)}
                              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                            >
                              {t("common.runSplit", { defaultValue: "Run Split" })}
                            </button>
                          ) : isTransfer ? (
                            <button
                              type="button"
                              onClick={() => handleTransferClick(evt)}
                              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                            >
                              Transfer
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExpenseMarkPaidClick(evt)}
                              className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                            >
                              {t("common.markSpent", { defaultValue: "Mark Spent" })}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Conditional Pagination Bar (if 5+ total records) */}
          {filteredTimeline.length >= 5 && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredTimeline.length}
                pageSizeOptions={[10, 15, 25, 50]}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Operational Shortfall Resolution Modal */}
      <InsufficientFundsModal
        isOpen={insufficientModalState.isOpen}
        onClose={() => setInsufficientModalState((prev) => ({ ...prev, isOpen: false }))}
        billName={insufficientModalState.billName}
        shortfallAmount={insufficientModalState.shortfall}
        availableCategories={categories.map((c) => ({
          ...c,
          currentBalance:
            typeof c.currentBalance === "string"
              ? parseFloat(c.currentBalance || "0")
              : c.currentBalance,
        }))}
        onConfirmTransferAndPay={handleConfirmShortfallTransfer}
      />

      <ConfirmDialog
        isOpen={!!eventToSkip}
        onClose={() => setEventToSkip(null)}
        onConfirm={() => {
          if (eventToSkip) {
            if (eventToSkip.kind === "INCOME") onSkipIncome(eventToSkip.id);
            else if (eventToSkip.kind === "TRANSFER") onSkipTransfer?.(eventToSkip.id);
            else onSkipExpense(eventToSkip.id);
            setEventToSkip(null);
          }
        }}
        title="Skip Scheduled Event?"
        description="Are you sure you want to skip this event? This scheduled event will be deleted for this cycle."
        confirmLabel="Skip & Delete"
        variant="danger"
      />
    </div>
  );
}
