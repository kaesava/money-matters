"use client";

import React from "react";
import { RecordFilterBadge } from "@money-matters/ui/web";
import { getTenantDateString } from "@money-matters/core";
import { TimelineEventItem } from "./timeline/types";
import { useUpcomingTimelineData } from "./timeline/useUpcomingTimelineData";
import { TimelineFiltersBar } from "./timeline/TimelineFiltersBar";
import { TimelineEventsTable } from "./timeline/TimelineEventsTable";
import { TimelineModals } from "./timeline/TimelineModals";

export type { TimelineEventItem };

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
    poolType?: string;
  }[];
  initialKindFilter?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  initialSearchQuery?: string;
  onAllocateIncome: (eventId: string) => void;
  onMarkExpensePaid: (
    eventId: string,
    amount: string,
    date: string,
    shortfallTransfers?: Array<{ sourceEnvelopeId: string; amount: string }>
  ) => void | Promise<void>;
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
  onOpenTransferModalWithData?: (data: {
    sourcePoolId?: string;
    destinationPoolId?: string;
    amount: string;
    date: string;
  }) => void;
  filterPoolId?: string;
  filterCategoryId?: string;
  onClearFilter?: () => void;
}

export function UpcomingTimelineTab({
  isLoading = false,
  incomeEvents,
  expenseEvents,
  transferEvents,
  savedIncomeEventIds,
  categories,
  pools = [],
  initialKindFilter = "ALL",
  initialSearchQuery = "",
  filterPoolId,
  filterCategoryId,
  onClearFilter,
  onAllocateIncome,
  onMarkExpensePaid,
  onSkipIncome,
  onSkipExpense,
  onSkipTransfer,
  onSaveTransferDraft,
  onExecuteTransfer,
}: UpcomingTimelineTabProps) {
  const {
    todayStr,
    kindFilter,
    setKindFilter,
    statusFilter,
    setStatusFilter,
    scopeFilter,
    setScopeFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    widths,
    onMouseDown,
    filteredTimeline,
    paginatedEvents,
    totalPages,
    transferModalEvent,
    setTransferModalEvent,
    editEvent,
    setEditEvent,
    eventToDelete,
    setEventToDelete,
    markPaidModalEvent,
    setMarkPaidModalEvent,
    handleExpenseMarkPaidClick,
    handleTransferClick,
    handleEventNameClick,
  } = useUpcomingTimelineData({
    incomeEvents,
    expenseEvents,
    transferEvents,
    initialKindFilter,
    initialSearchQuery,
    filterPoolId,
    filterCategoryId,
  });

  const handleOpenTransferFromMarkPaid = (resolvedPoolId: string) => {
    setTransferModalEvent({
      id: `transfer_${Date.now()}`,
      name: "Transfer between Pools",
      expectedAmount: "0.00",
      expectedDate: getTenantDateString(new Date()),
      destinationPoolId: resolvedPoolId,
      status: "PENDING",
    });
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      if (eventToDelete.kind === "INCOME") onSkipIncome(eventToDelete.id);
      else if (eventToDelete.kind === "TRANSFER") onSkipTransfer?.(eventToDelete.id);
      else onSkipExpense(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Active Filter Badge for Pool or Category Navigation */}
      {(filterPoolId || filterCategoryId) && (
        <div className="flex items-center gap-3 flex-wrap animate-in fade-in duration-150">
          <RecordFilterBadge
            label={
              filterPoolId
                ? `Filtered to Pool: ${pools.find((p) => p.id === filterPoolId)?.name || "Selected Pool"}`
                : `Filtered to Category: ${categories.find((c) => c.id === filterCategoryId)?.name || "Selected Category"}`
            }
            onClear={onClearFilter || (() => {})}
          />
        </div>
      )}

      {/* Controls Bar: Search, Status Filter, Kind Filter, Scope Filter */}
      <TimelineFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        autoFocus={Boolean(initialSearchQuery)}
      />

      {/* Standardized Table View */}
      <TimelineEventsTable
        isLoading={isLoading}
        filteredTimeline={filteredTimeline}
        paginatedEvents={paginatedEvents}
        widths={widths}
        onMouseDown={onMouseDown}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        todayStr={todayStr}
        savedIncomeEventIds={savedIncomeEventIds}
        onEventNameClick={handleEventNameClick}
        onExpenseMarkPaidClick={handleExpenseMarkPaidClick}
        onTransferClick={handleTransferClick}
        onAllocateIncome={onAllocateIncome}
        onRequestDelete={setEventToDelete}
      />

      {/* Modals & Dialogs */}
      <TimelineModals
        eventToDelete={eventToDelete}
        onCloseDelete={() => setEventToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
        markPaidModalEvent={markPaidModalEvent}
        onCloseMarkPaid={() => setMarkPaidModalEvent(null)}
        categories={categories}
        pools={pools}
        onMarkExpensePaid={onMarkExpensePaid}
        onOpenTransferFromMarkPaid={handleOpenTransferFromMarkPaid}
        transferModalEvent={transferModalEvent}
        onCloseTransfer={() => setTransferModalEvent(null)}
        onSaveTransferDraft={onSaveTransferDraft}
        onExecuteTransfer={onExecuteTransfer}
        onSkipTransfer={onSkipTransfer}
        editEvent={editEvent}
        onCloseEdit={() => setEditEvent(null)}
      />
    </div>
  );
}
