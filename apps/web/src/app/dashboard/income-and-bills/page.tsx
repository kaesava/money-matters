"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, Spinner, InfoTooltip, SearchInput, ResizableTh, useResizableColumns, fmtDate } from "@money-matters/ui/web";
import IncomeExpenseFormModal from "../../../components/web/IncomeExpenseFormModal";
import { MatrixPlanTab } from "./components/MatrixPlanTab";
import posthog from "../../../lib/posthog-client";

type ActiveTab = "STREAMS" | "EVENTS" | "MATRIX";

export default function IncomeAndBillsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("MATRIX");
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    categoriesQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    expenseSourcesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading;

  const pools = poolsQuery.data || [];
  const incomeSources = incomeSourcesQuery.data || [];
  const expenseSources = expenseSourcesQuery.data || [];
  const rawIncomeEvents = incomeEventsQuery.data;
  const rawExpenseEvents = expenseEventsQuery.data;

  const incomeEvents = React.useMemo(() => rawIncomeEvents || [], [rawIncomeEvents]);
  const expenseEvents = React.useMemo(() => rawExpenseEvents || [], [rawExpenseEvents]);

  const matrixIncomeEvents = incomeEvents.map((e) => ({
    id: e.id,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount || "0"),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "UPCOMING" | "CONFIRMED" | "SKIPPED",
    sourceName: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Paycheck",
  }));

  const matrixExpenseEvents = expenseEvents.map((e) => ({
    categoryId: e.poolId || e.categoryId || "",
    amount: parseFloat(e.expectedAmount || "0"),
    dueDate: e.expectedDate,
    status: e.status as "UPCOMING" | "PAID" | "SKIPPED",
  }));

  const allEvents = React.useMemo(() => {
    const incs = incomeEvents.map((e) => ({
      id: e.id,
      name: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Income Deposit",
      expectedDate: e.expectedDate,
      expectedAmount: parseFloat(e.expectedAmount || "0"),
      status: e.status as string,
      type: "INCOME" as const,
    }));
    const exps = expenseEvents.map((e) => ({
      id: e.id,
      name: e.name || "Scheduled Bill",
      expectedDate: e.expectedDate,
      expectedAmount: parseFloat(e.expectedAmount || "0"),
      status: e.status as string,
      type: "EXPENSE" as const,
    }));
    return [...incs, ...exps].sort((a, b) => (a.expectedDate || "").localeCompare(b.expectedDate || ""));
  }, [incomeEvents, expenseEvents]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  // Upcoming Events Table State
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [eventStatusFilter, setEventStatusFilter] = useState<"ALL" | "UPCOMING" | "PAID" | "SKIPPED">("ALL");
  const [eventSortColumn, setEventSortColumn] = useState<"type" | "name" | "expectedDate" | "expectedAmount" | "status">("expectedDate");
  const [eventSortDirection, setEventSortDirection] = useState<"asc" | "desc">("asc");

  const { widths, onMouseDown } = useResizableColumns({
    type: 120,
    name: 260,
    expectedDate: 140,
    expectedAmount: 140,
    status: 140,
  });

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((evt) => {
      if (eventTypeFilter !== "ALL" && evt.type !== eventTypeFilter) return false;
      if (eventStatusFilter !== "ALL") {
        if (eventStatusFilter === "PAID" && evt.status !== "PAID" && evt.status !== "CONFIRMED") return false;
        if (eventStatusFilter === "UPCOMING" && evt.status !== "UPCOMING") return false;
        if (eventStatusFilter === "SKIPPED" && evt.status !== "SKIPPED") return false;
      }
      if (eventSearchQuery.trim()) {
        const q = eventSearchQuery.toLowerCase().trim();
        const amtStr = evt.expectedAmount.toFixed(2);
        return evt.name.toLowerCase().includes(q) || amtStr.includes(q);
      }
      return true;
    });
  }, [allEvents, eventTypeFilter, eventStatusFilter, eventSearchQuery]);

  const sortedEvents = React.useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      let cmp = 0;
      if (eventSortColumn === "expectedDate") {
        cmp = (a.expectedDate || "").localeCompare(b.expectedDate || "");
      } else if (eventSortColumn === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (eventSortColumn === "type") {
        cmp = a.type.localeCompare(b.type);
      } else if (eventSortColumn === "expectedAmount") {
        cmp = a.expectedAmount - b.expectedAmount;
      } else if (eventSortColumn === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return eventSortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredEvents, eventSortColumn, eventSortDirection]);

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      utils.listIncomeSources.invalidate();
      utils.listIncomeEvents.invalidate();
    },
  });

  const handleArchive = useCallback(
    async (item: { id: string; name?: string }, mode: "INCOME" | "EXPENSE") => {
      const label = mode === "INCOME" ? "income schedule" : "bill";
      if (!confirm(`Archiving this ${label} will cancel all future upcoming events. Continue?`)) return;
      try {
        if (mode === "INCOME") {
          await archiveIncomeMut.mutateAsync({ id: item.id });
          posthog.capture("income_source_archived");
        }
        toast.success(t("toasts.archived"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to archive.");
      }
    },
    [archiveIncomeMut, toast]
  );

  const currentUserId = pools[0]?.id || "default-user";

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B]">Income & Bill Management</h1>
          <InfoTooltip
            title="Income & Bill Management"
            content="Manage your recurring income schedules, bill commitments, and 12-month payday matrix."
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setModalMode("INCOME");
              setSourceToEdit(undefined);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#2563eb] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            + Add Income Schedule
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode("EXPENSE");
              setSourceToEdit(undefined);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#1B2B4B] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 transition-colors"
          >
            + Add Bill Schedule
          </button>
        </div>
      </div>

      {/* 3-Tab Viewport Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-zinc-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("MATRIX")}
          className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
            activeTab === "MATRIX"
              ? "bg-[#2563eb] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Upcoming (Grid)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EVENTS")}
          className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
            activeTab === "EVENTS"
              ? "bg-[#2563eb] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Upcoming (List) ({allEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("STREAMS")}
          className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
            activeTab === "STREAMS"
              ? "bg-[#2563eb] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Setup ({incomeSources.length + expenseSources.length})
        </button>
      </div>

      {activeTab === "MATRIX" && (
        <MatrixPlanTab
          currentUserId={currentUserId}
          categories={pools.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.poolType,
            currentBalance: parseFloat(String(p.currentBalance || "0")),
            targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : 0,
          }))}
          incomeEvents={matrixIncomeEvents}
          expenseEvents={matrixExpenseEvents}
        />
      )}

      {activeTab === "STREAMS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-[#1B2B4B] text-base mb-2">{`Income Schedules (${incomeSources.length})`}</h3>
              <div className="divide-y divide-zinc-100 mt-3">
                {incomeSources.map((inc) => (
                  <div key={inc.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-[#1B2B4B] block">{inc.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">
                        ${parseFloat(inc.amount).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(inc, "INCOME")}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-[#1B2B4B] text-base mb-2">{`Bill Schedules (${expenseSources.length})`}</h3>
              <div className="divide-y divide-zinc-100 mt-3">
                {expenseSources.map((exp) => (
                  <div key={exp.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-[#1B2B4B] block">{exp.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">
                        ${parseFloat(exp.amount).toFixed(2)} • {exp.poolName || "Pool"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleArchive(exp, "EXPENSE")}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "EVENTS" && (
        <div className="space-y-4 p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
            <SearchInput
              value={eventSearchQuery}
              onChange={setEventSearchQuery}
              placeholder="Search event name or amount..."
            />

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as "ALL" | "INCOME" | "EXPENSE")}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">All Types</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Bills Only</option>
              </select>

              <select
                value={eventStatusFilter}
                onChange={(e) => setEventStatusFilter(e.target.value as "ALL" | "UPCOMING" | "PAID" | "SKIPPED")}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="PAID">Confirmed / Paid</option>
                <option value="SKIPPED">Skipped</option>
              </select>
            </div>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-semibold">
              No scheduled events found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <ResizableTh
                      width={widths.type}
                      onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("type", e)}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        if (eventSortColumn === "type") setEventSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        else { setEventSortColumn("type"); setEventSortDirection("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Type</span>
                        {eventSortColumn === "type" && <span>{eventSortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </ResizableTh>
                    <ResizableTh
                      width={widths.name}
                      onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("name", e)}
                      className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        if (eventSortColumn === "name") setEventSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        else { setEventSortColumn("name"); setEventSortDirection("asc"); }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Event Name</span>
                        {eventSortColumn === "name" && <span>{eventSortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </ResizableTh>
                    <ResizableTh
                      width={widths.expectedDate}
                      onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("expectedDate", e)}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        if (eventSortColumn === "expectedDate") setEventSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        else { setEventSortColumn("expectedDate"); setEventSortDirection("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Expected Date</span>
                        {eventSortColumn === "expectedDate" && <span>{eventSortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </ResizableTh>
                    <ResizableTh
                      width={widths.expectedAmount}
                      onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("expectedAmount", e)}
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        if (eventSortColumn === "expectedAmount") setEventSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        else { setEventSortColumn("expectedAmount"); setEventSortDirection("desc"); }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Amount</span>
                        {eventSortColumn === "expectedAmount" && <span>{eventSortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </ResizableTh>
                    <ResizableTh
                      width={widths.status}
                      onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("status", e)}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        if (eventSortColumn === "status") setEventSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                        else { setEventSortColumn("status"); setEventSortDirection("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {eventSortColumn === "status" && <span>{eventSortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </ResizableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                  {sortedEvents.map((evt) => (
                    <tr key={evt.id + evt.type} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          evt.type === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {evt.type === "INCOME" ? "Income" : "Bill"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-[#1B2B4B]">{evt.name}</td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-500">{fmtDate(evt.expectedDate)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                        evt.type === "INCOME" ? "text-emerald-600" : "text-zinc-900"
                      }`}>
                        {evt.type === "INCOME" ? "+" : "-"}${evt.expectedAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          evt.status === "UPCOMING"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : evt.status === "CONFIRMED" || evt.status === "PAID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <IncomeExpenseFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSourceToEdit(undefined);
          }}
          mode={modalMode}
          sourceToEdit={sourceToEdit}
        />
      )}
    </div>
  );
}
