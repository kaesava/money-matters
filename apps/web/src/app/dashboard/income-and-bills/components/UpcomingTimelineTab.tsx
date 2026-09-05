"use client";

import React, { useState, useMemo, useEffect } from "react";
import { EventItem } from "./BurstModal";
import { InsufficientFundsModal } from "./InsufficientFundsModal";
import { PaginationBar } from "@money-matters/ui/web";

export interface TimelineEventItem extends EventItem {
  categoryId?: string | null;
  categoryName?: string | null;
  accountName?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
  isSkipped?: boolean;
}

interface UpcomingTimelineTabProps {
  incomeEvents: TimelineEventItem[];
  expenseEvents: TimelineEventItem[];
  transferEvents: TimelineEventItem[];
  categories: {
    id: string;
    name: string;
    currentBalance: string | number;
  }[];
  searchQuery: string;
  initialKindFilter?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  onMarkIncomeReceived: (eventId: string, amount: string, date: string) => void;
  onAllocateIncome: (eventId: string) => void;
  onMarkExpensePaid: (eventId: string, amount: string, date: string) => void;
  onSkipIncome: (eventId: string) => void;
  onSkipExpense: (eventId: string) => void;
  onSkipTransfer?: (eventId: string) => void;
  onUnskipIncome: (eventId: string) => void;
  onUnskipExpense: (eventId: string) => void;
  onUnskipTransfer?: (eventId: string) => void;
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
  incomeEvents,
  expenseEvents,
  transferEvents,
  categories,
  searchQuery,
  initialKindFilter = "ALL",
  onMarkIncomeReceived,
  onAllocateIncome,
  onMarkExpensePaid,
  onSkipIncome,
  onSkipExpense,
  onSkipTransfer,
  onUnskipIncome,
  onUnskipExpense,
  onUnskipTransfer,
  onExecuteTransfer,
  onConfirmTransferAndPay,
  onOpenTransferModalWithData,
}: UpcomingTimelineTabProps) {
  // Segmented Type Filter: ALL | INCOME | EXPENSE | TRANSFER
  const [kindFilter, setKindFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">(initialKindFilter);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  // Filter & sort all events chronologically
  const filteredTimeline = useMemo(() => {
    const all = [
      ...incomeEvents.map((e) => ({ ...e, eventKind: "INCOME" as const })),
      ...expenseEvents.map((e) => ({ ...e, eventKind: "EXPENSE" as const })),
      ...transferEvents.map((e) => ({ ...e, eventKind: "TRANSFER" as const })),
    ];

    return all
      .filter((e) => {
        // 1. Kind filter (INCOME / EXPENSE / TRANSFER)
        if (kindFilter !== "ALL" && e.eventKind !== kindFilter) return false;
        // 2. Search query filter
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (e.name || "").toLowerCase().includes(q) ||
          (e.note || "").toLowerCase().includes(q) ||
          (e.categoryName || "").toLowerCase().includes(q) ||
          (e.accountName || "").toLowerCase().includes(q) ||
          (e.sourcePoolName || "").toLowerCase().includes(q) ||
          (e.destinationPoolName || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
  }, [incomeEvents, expenseEvents, transferEvents, kindFilter, searchQuery]);

  const earliestPendingIncomeId = useMemo(() => {
    const upcomingIncomes = incomeEvents
      .filter((e) => e.status !== "CONFIRMED" && e.status !== "SKIPPED" && !e.isSkipped)
      .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());
    return upcomingIncomes[0]?.id || null;
  }, [incomeEvents]);

  useEffect(() => {
    setPage(1);
  }, [kindFilter, searchQuery]);

  // Paginated slice
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
    <div className="flex flex-col gap-6 w-full">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
            <span>📅</span>
            <span>Upcoming Events</span>
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Full chronological schedule of income deposits, bill obligations, and transfers.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setKindFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            All Events ({filteredTimeline.length})
          </button>
          <button
            onClick={() => setKindFilter("INCOME")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "INCOME"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Income Only
          </button>
          <button
            onClick={() => setKindFilter("EXPENSE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "EXPENSE"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Expense Only
          </button>
          <button
            onClick={() => setKindFilter("TRANSFER")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "TRANSFER"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Transfer Only
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {filteredTimeline.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500">
            No upcoming events found matching your filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedEvents.map((evt) => {
            const isIncome = evt.eventKind === "INCOME";
            const isTransfer = evt.eventKind === "TRANSFER";
            const isSkipped = evt.status === "SKIPPED" || evt.isSkipped;
            const dateObj = new Date(evt.expectedDate + "T00:00:00");
            const formattedDate = new Intl.DateTimeFormat("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Australia/Sydney",
            }).format(dateObj);

            return (
              <div
                key={`${evt.eventKind}_${evt.id}`}
                className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                  isSkipped
                    ? "opacity-50 bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                    : isIncome
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                    : isTransfer
                    ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/40"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Clean, compact inline date badge */}
                  <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-lg shrink-0">
                    {formattedDate}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {evt.name || (isIncome ? "Income Deposit" : isTransfer ? "Pool Transfer" : "Scheduled Expense")}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isIncome
                            ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                            : isTransfer
                            ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {isIncome ? "Income Deposit" : isTransfer ? "Transfer" : evt.categoryName || "Expense"}
                      </span>
                      {isSkipped && (
                        <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          SKIPPED
                        </span>
                      )}
                    </div>

                    {/* Description / Note */}
                    {evt.note && (
                      <p className="text-[11px] text-zinc-500 italic truncate mt-0.5">
                        {evt.note}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {isIncome
                        ? `Receiving: ${evt.accountName || "Main Account"}`
                        : isTransfer
                        ? `From: ${evt.sourcePoolName || "Source"} ➔ To: ${evt.destinationPoolName || "Destination"}`
                        : `Pool: ${evt.categoryName || "Uncategorized"}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-black font-mono tabular-nums ${
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isTransfer
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-[#1B2B4B] dark:text-white"
                    }`}
                  >
                    {isIncome ? "+" : isTransfer ? "↔" : "-"}${parseFloat(evt.expectedAmount || "0").toFixed(2)}
                  </span>

                  {/* Actions: Skip / Unskip & Mark Paid / Transfer */}
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      if (isSkipped) {
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              isIncome
                                ? onUnskipIncome(evt.id)
                                : isTransfer
                                ? onUnskipTransfer?.(evt.id)
                                : onUnskipExpense(evt.id)
                            }
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-lg transition-colors"
                          >
                            Unskip
                          </button>
                        );
                      }

                      return (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              isIncome
                                ? onSkipIncome(evt.id)
                                : isTransfer
                                ? onSkipTransfer?.(evt.id)
                                : onSkipExpense(evt.id)
                            }
                            className="px-2.5 py-1 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-xs rounded-lg transition-colors"
                            title="Skip this single occurrence"
                          >
                            Skip
                          </button>
                          {isIncome ? (
                            evt.id === earliestPendingIncomeId ? (
                              <button
                                type="button"
                                onClick={() => onMarkIncomeReceived(evt.id, evt.expectedAmount, evt.expectedDate)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                              >
                                Mark Received
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAllocateIncome(evt.id)}
                                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-lg transition-colors shadow-xs"
                              >
                                Allocate
                              </button>
                            )
                          ) : isTransfer ? (
                            <button
                              type="button"
                              onClick={() => handleTransferClick(evt)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                            >
                              Transfer
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExpenseMarkPaidClick(evt)}
                              className="px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                            >
                              Mark Paid
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}

          {/* PaginationBar integration */}
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

      {/* Operational Shortfall Resolution Modal */}
      <InsufficientFundsModal
        isOpen={insufficientModalState.isOpen}
        onClose={() => setInsufficientModalState((prev) => ({ ...prev, isOpen: false }))}
        billName={insufficientModalState.billName}
        shortfallAmount={insufficientModalState.shortfall}
        availableCategories={categories.map((c) => ({
          ...c,
          currentBalance: typeof c.currentBalance === "string" ? parseFloat(c.currentBalance || "0") : c.currentBalance,
        }))}
        onConfirmTransferAndPay={handleConfirmShortfallTransfer}
      />
    </div>
  );
}
