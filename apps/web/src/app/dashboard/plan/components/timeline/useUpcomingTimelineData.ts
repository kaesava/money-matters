import { useState, useMemo, useEffect } from "react";
import { useResizableColumns } from "@money-matters/ui/web";
import { getTenantDateString } from "@money-matters/core";
import { TimelineEventItem } from "./types";

export interface UseUpcomingTimelineDataOptions {
  incomeEvents: TimelineEventItem[];
  expenseEvents: TimelineEventItem[];
  transferEvents: TimelineEventItem[];
  initialKindFilter?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  initialSearchQuery?: string;
  filterPoolId?: string;
  filterCategoryId?: string;
}

export function useUpcomingTimelineData({
  incomeEvents,
  expenseEvents,
  transferEvents,
  initialKindFilter = "ALL",
  initialSearchQuery = "",
  filterPoolId,
  filterCategoryId,
}: UseUpcomingTimelineDataOptions) {
  const todayStr = useMemo(() => getTenantDateString(new Date()), []);

  // Filter States
  const [kindFilter, setKindFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "TRANSFER">(initialKindFilter);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERDUE">("ALL");
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

  // Modal target states
  const [transferModalEvent, setTransferModalEvent] = useState<TimelineEventItem | null>(null);
  const [editEvent, setEditEvent] = useState<TimelineEventItem | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{
    id: string;
    kind: "INCOME" | "EXPENSE" | "TRANSFER";
  } | null>(null);
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
        // Exclude CONFIRMED records from Upcoming timeline
        if (e.status === "CONFIRMED") return false;

        // Kind filter
        if (kindFilter !== "ALL" && e.eventKind !== kindFilter) return false;

        // Status filter (All vs Overdue)
        if (statusFilter === "OVERDUE" && e.expectedDate >= todayStr) return false;

        // Explicit Pool ID filter
        if (filterPoolId) {
          const matchesPool =
            e.poolId === filterPoolId ||
            e.categoryId === filterPoolId ||
            e.sourcePoolId === filterPoolId ||
            e.destinationPoolId === filterPoolId;
          if (!matchesPool) return false;
        }

        // Explicit Category ID filter
        if (filterCategoryId) {
          const matchesCategory = e.categoryId === filterCategoryId;
          if (!matchesCategory) return false;
        }

        // Scope filter (Shared / Private)
        if (scopeFilter === "PRIVATE" && !e.isPrivate) return false;
        if (scopeFilter === "SHARED" && e.isPrivate) return false;

        // Search query
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
  }, [
    incomeEvents,
    expenseEvents,
    transferEvents,
    kindFilter,
    statusFilter,
    todayStr,
    scopeFilter,
    searchQuery,
    sortField,
    sortOrder,
    filterPoolId,
    filterCategoryId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [kindFilter, statusFilter, scopeFilter, searchQuery, filterPoolId, filterCategoryId]);

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

  const handleEventNameClick = (evt: TimelineEventItem) => {
    if (evt.eventKind === "TRANSFER") {
      setTransferModalEvent(evt);
    } else {
      setEditEvent(evt);
    }
  };

  return {
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
  };
}
