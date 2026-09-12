"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { EventItem } from "./BurstModal";
import { MarkPaidModal, ShortfallTransferItem } from "./MarkPaidModal";
import {
  PaginationBar,
  SearchInput,
  SkeletonTable,
  ResizableTh,
  useResizableColumns,
  ConfirmDialog,
  useToast,
} from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { getTenantDateString } from "@money-matters/core";
import { trpc } from "../../../../lib/trpc";
import { TransferModal } from "../../../../components/web/TransferModal";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface TimelineEventItem extends EventItem {
  name?: string | null;
  note?: string | null;
  poolId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
  isPrivate?: boolean;
}

interface UpcomingTimelineTabProps {
  isLoading?: boolean;
  incomeEvents: TimelineEventItem[];
  expenseEvents: TimelineEventItem[];
  transferEvents: TimelineEventItem[];
  savedIncomeEventIds?: Set<string>;
  categories: {
    id: string;
    name: string;
    poolId?: string;
    currentBalance: string | number;
  }[];
  pools?: {
    id: string;
    name: string;
    currentBalance: string | number;
    bankAccountId?: string | null;
  }[];
  initialKindFilter?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  initialSearchQuery?: string;
  onAllocateIncome: (eventId: string) => void;
  onMarkExpensePaid: (eventId: string, amount: string, date: string) => void;
  onSkipIncome: (eventId: string) => void;
  onSkipExpense: (eventId: string) => void;
  onSkipTransfer?: (eventId: string) => void;
  onSaveTransferDraft?: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
  }) => Promise<void>;
  onExecuteTransfer?: (
    eventId: string,
    amount: string,
    name?: string,
    sourcePoolId?: string,
    destinationPoolId?: string
  ) => Promise<void> | void;
  onConfirmTransferAndPay: (
    transfers: ShortfallTransferItem[],
    destCategoryId: string
  ) => Promise<void>;
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
  savedIncomeEventIds: _savedIncomeEventIds,
  categories,
  pools = [],
  initialKindFilter = "ALL",
  initialSearchQuery = "",
  onAllocateIncome,
  onMarkExpensePaid,
  onSkipIncome,
  onSkipExpense,
  onSkipTransfer,
  onSaveTransferDraft,
  onExecuteTransfer: _onExecuteTransfer,
  onConfirmTransferAndPay,
  onOpenTransferModalWithData: _onOpenTransferModalWithData,
}: UpcomingTimelineTabProps) {
  const toast = useToast();
  const { fmt, fmtDate: formatLocaleDate } = useLocale();
  const utils = trpc.useUtils();
  const revertPlanMut = trpc.revertAllocationPlan.useMutation();
  const todayStr = useMemo(() => getTenantDateString(new Date()), []);
  const [incomeToUnsaveId, setIncomeToUnsaveId] = useState<string | null>(null);
  const [transferModalEvent, setTransferModalEvent] = useState<TimelineEventItem | null>(null);

  // Filter States
  const [kindFilter, setKindFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">(initialKindFilter);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    if (initialKindFilter) setKindFilter(initialKindFilter);
  }, [initialKindFilter]);

  useEffect(() => {
    if (typeof initialSearchQuery === "string") setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Sort State
  const [sortField, setSortField] = useState<"date" | "name" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { widths, onMouseDown } = useResizableColumns({
    date: 140,
    name: 260,
    poolAccount: 240,
    amount: 140,
    actions: 200,
  });

  const [eventToDelete, setEventToDelete] = useState<{ id: string; kind: "INCOME" | "EXPENSE" | "TRANSFER" } | null>(null);
  const [markPaidModalEvent, setMarkPaidModalEvent] = useState<TimelineEventItem | null>(null);

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
        // 0. Exclude CONFIRMED records from Upcoming timeline
        if (e.status === "CONFIRMED") return false;

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
    setMarkPaidModalEvent(evt);
  };

  const handleTransferClick = (evt: TimelineEventItem) => {
    setTransferModalEvent(evt);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Controls Bar: Search, Kind Filter, Scope Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="flex-1 w-full max-w-full">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search events, pools, accounts, amount..."
            autoFocus={Boolean(initialSearchQuery)}
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
                    className="py-3 px-4 text-center"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("date")}
                      className="flex items-center justify-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold w-full"
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
                    width={widths.poolAccount}
                    onResizeMouseDown={(e) => onMouseDown("poolAccount", e)}
                    className="py-3 px-4 text-left"
                  >
                    <span>Pool / Bank Account</span>
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

                  // Past Date calculation
                  const isPast = evt.expectedDate < todayStr;
                  const formattedDate = formatLocaleDate(evt.expectedDate);

                  return (
                    <tr
                      key={`${evt.eventKind}_${evt.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Date Column */}
                      <td className="py-3 px-4 text-center font-mono font-medium">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span
                            className={
                              isPast
                                ? "text-red-600 dark:text-red-400 font-bold"
                                : "text-zinc-700 dark:text-zinc-300"
                            }
                          >
                            {formattedDate}
                          </span>
                          {isPast && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name Column (Clean without redundant badges) */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {evt.name ||
                              (isIncome
                                ? "Income Deposit"
                                : isTransfer
                                ? "Pool Transfer"
                                : "Scheduled Expense")}
                          </span>
                          {evt.note && (
                            <span className="text-[11px] text-zinc-400 italic">
                              {evt.note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* POOL / BANK ACCOUNT Column with exact ID links */}
                      <td className="py-3 px-4 text-left text-xs">
                        {isTransfer ? (
                          <div className="flex items-center gap-1 font-semibold text-xs">
                            <Link
                              href={`/dashboard/pools?poolId=${evt.poolId}`}
                              className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>{evt.categoryName || "Source"}</span>
                              <span className="text-[10px] text-blue-400">↗</span>
                            </Link>
                            <span className="text-zinc-400">➔</span>
                            <Link
                              href={`/dashboard/pools?poolId=${evt.destinationPoolId}`}
                              className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>{evt.destinationPoolName || "Destination"}</span>
                              <span className="text-[10px] text-blue-400">↗</span>
                            </Link>
                          </div>
                        ) : isIncome ? (
                          evt.accountId ? (
                            <Link
                              href={`/dashboard/bank-accounts?id=${evt.accountId}`}
                              className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>{evt.accountName || "Bank Account"}</span>
                              <span className="text-[10px] text-blue-400">↗</span>
                            </Link>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                              {evt.accountName || "Bank Account"}
                            </span>
                          )
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {evt.poolId || evt.categoryId ? (
                              <Link
                                href={`/dashboard/pools?poolId=${evt.poolId || evt.categoryId}`}
                                className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>{evt.categoryName || "Pool"}</span>
                                <span className="text-[10px] text-blue-400">↗</span>
                              </Link>
                            ) : (
                              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                {evt.categoryName || "—"}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount Column */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums">
                        <span
                          className={
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isTransfer
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {isIncome ? "+" : isTransfer ? "↔" : "-"}
                          {fmt(parseFloat(evt.expectedAmount || "0"))}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {isIncome ? (
                            <div className="flex flex-row items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAllocateIncome(evt.id)}
                                className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-1.5 py-0.5"
                                title="Review and Edit Splits"
                              >
                                {t("common.runSplit", { defaultValue: "Run Split" })}
                              </button>
                            </div>
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

                          <button
                            type="button"
                            onClick={() =>
                              setEventToDelete({
                                id: evt.id,
                                kind: isIncome ? "INCOME" : isTransfer ? "TRANSFER" : "EXPENSE",
                              })
                            }
                            className="text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title={isIncome ? "Delete Income record" : "Delete this event"}
                          >
                            Delete
                          </button>
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

      {/* Delete Event Confirmation */}

      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) {
            if (eventToDelete.kind === "INCOME") onSkipIncome(eventToDelete.id);
            else if (eventToDelete.kind === "TRANSFER") onSkipTransfer?.(eventToDelete.id);
            else onSkipExpense(eventToDelete.id);
            setEventToDelete(null);
          }
        }}
        title={
          eventToDelete?.kind === "INCOME"
            ? "Delete Income"
            : eventToDelete?.kind === "TRANSFER"
            ? "Delete Transfer"
            : "Delete Expense"
        }
        description={
          eventToDelete?.kind === "INCOME"
            ? "Are you sure you want to Delete this Income?"
            : eventToDelete?.kind === "TRANSFER"
            ? "Are you sure you want to Delete this Transfer?"
            : "Are you sure you want to Delete this Expense?"
        }
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!incomeToUnsaveId}
        onClose={() => setIncomeToUnsaveId(null)}
        onConfirm={async () => {
          if (incomeToUnsaveId) {
            try {
              await revertPlanMut.mutateAsync({ incomeEventId: incomeToUnsaveId });
              await utils.listAllAllocationPlans.invalidate();
              await utils.listIncomeEvents.invalidate();
              await utils.listExpenseEvents.invalidate();
              await utils.listPools.invalidate();
              toast.success(t("matrix.revertSuccess", { defaultValue: "Reverted. Income Split will be auto-calculated." }));
            } catch (_err) {
              toast.error("Failed to unsave payday.");
            } finally {
              setIncomeToUnsaveId(null);
            }
          }
        }}
        title={t("matrix.unsaveDialogTitle", { defaultValue: "Unsave Income Split" })}
        description={t("matrix.unsaveDialogDescription", { defaultValue: "Your saved Income Split will be lost and will be auto-calculated. Continue?" })}
        confirmLabel={t("common.unsave", { defaultValue: "Unsave" })}
        variant="danger"
      />
      {markPaidModalEvent && (() => {
        const resolvedPoolId =
          markPaidModalEvent.poolId ||
          categories.find((c) => c.id === markPaidModalEvent.categoryId)?.poolId ||
          markPaidModalEvent.categoryId ||
          markPaidModalEvent.sourcePoolId ||
          "";
        const matchedPool = pools.find((p) => p.id === resolvedPoolId);

        return (
          <MarkPaidModal
            isOpen={Boolean(markPaidModalEvent)}
            onClose={() => setMarkPaidModalEvent(null)}
            billName={markPaidModalEvent.name || "Expense"}
            poolId={resolvedPoolId}
            poolName={matchedPool?.name}
            poolType={(matchedPool as { poolType?: string } | undefined)?.poolType}
            initialAmount={markPaidModalEvent.expectedAmount || "0"}
            initialDate={markPaidModalEvent.expectedDate}
            availableCategories={pools.map((p) => ({
              ...p,
              currentBalance:
                typeof p.currentBalance === "string"
                  ? parseFloat(p.currentBalance || "0")
                  : (p.currentBalance ?? 0),
            }))}
            onConfirmMarkPaid={async ({ amount, date, transfers }) => {
              const nonZeroTransfers = (transfers || []).filter(
                (t) => parseFloat(t.amount || "0") > 0
              );
              if (nonZeroTransfers.length > 0) {
                await onConfirmTransferAndPay(nonZeroTransfers, resolvedPoolId);
              }
              await onMarkExpensePaid(markPaidModalEvent.id, amount.toFixed(2), date);
              setMarkPaidModalEvent(null);
            }}
            onOpenTransferModal={() => {
              setTransferModalEvent({
                id: `transfer_${Date.now()}`,
                name: "Transfer between Pools",
                expectedAmount: "0.00",
                expectedDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()),
                destinationPoolId: resolvedPoolId,
                status: "PENDING",
              });
            }}
          />
        );
      })()}

      {transferModalEvent && (
        <TransferModal
          isOpen={Boolean(transferModalEvent)}
          onClose={() => setTransferModalEvent(null)}
          transfer={{
            id: transferModalEvent.id,
            name: transferModalEvent.name || "Transfer",
            expectedAmount: transferModalEvent.expectedAmount || "0",
            expectedDate: transferModalEvent.expectedDate,
            sourcePoolId: transferModalEvent.sourcePoolId,
            sourcePoolName: transferModalEvent.sourcePoolName,
            destinationPoolId: transferModalEvent.destinationPoolId,
            destinationPoolName: transferModalEvent.destinationPoolName,
          }}
          pools={pools.map((p) => ({
            id: p.id,
            name: p.name,
            currentBalance: p.currentBalance,
            bankAccountId: p.bankAccountId,
          }))}
          onSaveDraft={async (params) => {
            if (onSaveTransferDraft) {
              await onSaveTransferDraft(params);
            }
            setTransferModalEvent(null);
          }}
          onConfirmTransfer={async (params) => {
            if (_onExecuteTransfer) {
              await _onExecuteTransfer(
                params.eventId,
                params.amount,
                params.name,
                params.sourcePoolId,
                params.destinationPoolId
              );
            }
            setTransferModalEvent(null);
          }}
          onDeleteTransfer={async (eventId) => {
            if (onSkipTransfer) {
              onSkipTransfer(eventId);
            }
            setTransferModalEvent(null);
          }}
          formatAUD={fmt}
        />
      )}
    </div>
  );
}
