"use client";

import React, { useState, useCallback, useMemo } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, Spinner, InfoTooltip, SearchInput, ResizableTh, useResizableColumns, fmtDate, Tabs, ConfirmDialog } from "@money-matters/ui/web";
import IncomeExpenseFormModal from "../../../components/web/IncomeExpenseFormModal";

import { MatrixPlanTab } from "./components/MatrixPlanTab";

const getAestTodayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

export default function IncomeAndBillsPage() {
  const [activeTab, setActiveTab] = useState("MATRIX");
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

  const rawPools = poolsQuery.data;
  const rawIncomeSources = incomeSourcesQuery.data;
  const rawExpenseSources = expenseSourcesQuery.data;

  const pools = useMemo(() => rawPools || [], [rawPools]);
  const incomeSources = useMemo(() => rawIncomeSources || [], [rawIncomeSources]);
  const expenseSources = useMemo(() => rawExpenseSources || [], [rawExpenseSources]);
  const rawIncomeEvents = incomeEventsQuery.data;
  const rawExpenseEvents = expenseEventsQuery.data;

  const incomeEvents = useMemo(() => rawIncomeEvents || [], [rawIncomeEvents]);
  const expenseEvents = useMemo(() => rawExpenseEvents || [], [rawExpenseEvents]);

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

  const todayStr = useMemo(() => getAestTodayStr(), []);

  // Filter Upcoming (Pending / Unaetioned) Events Only
  const pendingEvents = useMemo(() => {
    const incs = incomeEvents
      .filter((e) => e.status !== "CONFIRMED" && e.status !== "SKIPPED")
      .map((e) => ({
        id: e.id,
        name: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Income Deposit",
        expectedDate: e.expectedDate,
        expectedAmount: parseFloat(e.expectedAmount || "0"),
        status: e.status as string,
        type: "INCOME" as const,
        isOverdue: e.expectedDate <= todayStr,
      }));
    const exps = expenseEvents
      .filter((e) => e.status !== "PAID" && e.status !== "SKIPPED")
      .map((e) => ({
        id: e.id,
        name: e.name || "Scheduled Bill",
        expectedDate: e.expectedDate,
        expectedAmount: parseFloat(e.expectedAmount || "0"),
        status: e.status as string,
        type: "EXPENSE" as const,
        isOverdue: e.expectedDate <= todayStr,
      }));
    return [...incs, ...exps].sort((a, b) => (a.expectedDate || "").localeCompare(b.expectedDate || ""));
  }, [incomeEvents, expenseEvents, todayStr]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  // Setup Tab Search State
  const [setupSearchQuery, setSetupSearchQuery] = useState("");

  // Upcoming Table State & Sorting
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [eventSortColumn, setEventSortColumn] = useState<"type" | "name" | "expectedDate" | "expectedAmount">("expectedDate");
  const [eventSortDirection, setEventSortDirection] = useState<"asc" | "desc">("asc");

  const { widths: eventWidths, onMouseDown: onEventMouseDown } = useResizableColumns({
    type: 110,
    name: 240,
    expectedDate: 150,
    expectedAmount: 140,
    actions: 180,
  });

  const { widths: setupWidths, onMouseDown: onSetupMouseDown } = useResizableColumns({
    name: 220,
    frequency: 130,
    accountOrPool: 180,
    amount: 120,
  });

  // Action Mutations
  const markIncomeReceivedMut = trpc.markIncomeReceived.useMutation();
  const markExpensePaidMut = trpc.markExpensePaid.useMutation();
  const skipIncomeMut = trpc.skipIncomeEvent.useMutation();
  const skipExpenseMut = trpc.skipExpenseEvent.useMutation();

  const handleActionReceivedOrPaid = useCallback(
    async (evt: { id: string; type: "INCOME" | "EXPENSE"; name: string }) => {
      try {
        if (evt.type === "INCOME") {
          await markIncomeReceivedMut.mutateAsync({ eventId: evt.id });
          toast.success(`Marked "${evt.name}" as received.`);
        } else {
          await markExpensePaidMut.mutateAsync({ eventId: evt.id });
          toast.success(`Marked "${evt.name}" as paid.`);
        }
        utils.listIncomeEvents.invalidate();
        utils.listExpenseEvents.invalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to process event.");
      }
    },
    [markIncomeReceivedMut, markExpensePaidMut, utils, toast]
  );

  const [eventToSkip, setEventToSkip] = useState<{ id: string; type: "INCOME" | "EXPENSE"; name: string } | null>(null);

  const handleActionSkip = useCallback(
    (evt: { id: string; type: "INCOME" | "EXPENSE"; name: string }) => {
      setEventToSkip(evt);
    },
    []
  );

  const confirmSkip = useCallback(async () => {
    if (!eventToSkip) return;
    try {
      if (eventToSkip.type === "INCOME") {
        await skipIncomeMut.mutateAsync({ eventId: eventToSkip.id });
      } else {
        await skipExpenseMut.mutateAsync({ eventId: eventToSkip.id });
      }
      toast.success(`Skipped "${eventToSkip.name}".`);
      utils.listIncomeEvents.invalidate();
      utils.listExpenseEvents.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to skip event.");
    } finally {
      setEventToSkip(null);
    }
  }, [eventToSkip, skipIncomeMut, skipExpenseMut, utils, toast]);


  // Setup Tab Filtered Schedules
  const filteredIncomeSources = useMemo(() => {
    if (!setupSearchQuery.trim()) return incomeSources;
    const q = setupSearchQuery.toLowerCase().trim();
    return incomeSources.filter(
      (inc) => inc.name.toLowerCase().includes(q) || String(inc.amount).includes(q)
    );
  }, [incomeSources, setupSearchQuery]);

  const filteredExpenseSources = useMemo(() => {
    if (!setupSearchQuery.trim()) return expenseSources;
    const q = setupSearchQuery.toLowerCase().trim();
    return expenseSources.filter(
      (exp) => exp.name.toLowerCase().includes(q) || String(exp.amount).includes(q) || (exp.poolName || "").toLowerCase().includes(q)
    );
  }, [expenseSources, setupSearchQuery]);

  // Upcoming Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return pendingEvents.filter((evt) => {
      if (eventTypeFilter !== "ALL" && evt.type !== eventTypeFilter) return false;
      if (eventSearchQuery.trim()) {
        const q = eventSearchQuery.toLowerCase().trim();
        const amtStr = evt.expectedAmount.toFixed(2);
        return evt.name.toLowerCase().includes(q) || amtStr.includes(q);
      }
      return true;
    });
  }, [pendingEvents, eventTypeFilter, eventSearchQuery]);

  const sortedEvents = useMemo(() => {
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
      }
      return eventSortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredEvents, eventSortColumn, eventSortDirection]);

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black text-[#1B2B4B]">Income & Bill Management</h1>
        <InfoTooltip
          title="Income & Bill Management"
          content="Manage your recurring income schedules, bill commitments, and 12-month payday matrix."
        />
      </div>

      <Tabs
        tabs={[
          { id: "MATRIX", label: t("transactions.tabs.allocatePendingIncome", { defaultValue: "Allocate Pending Income" }) },
          { id: "EVENTS", label: t("transactions.tabs.pendingList", { defaultValue: "Pending List" }) },
          { id: "STREAMS", label: t("transactions.tabs.setup", { defaultValue: "Setup" }) },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

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
          {/* Top Unified Search Input */}
          <div className="p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl max-w-md">
            <SearchInput
              value={setupSearchQuery}
              onChange={setSetupSearchQuery}
              placeholder="Search income or bill schedules..."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Schedules Card */}
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold text-[#1B2B4B] text-base">Income Schedules</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("INCOME");
                      setSourceToEdit(undefined);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#2563eb] text-white rounded-xl font-bold text-xs shadow-xs hover:bg-[#1d4ed8] transition-colors"
                  >
                    + Add Income Schedule
                  </button>
                </div>

                {filteredIncomeSources.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-zinc-400">
                    No income schedules found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <ResizableTh
                            width={setupWidths.name}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("name", e)}
                            className="py-2 px-3 text-left"
                          >
                            <span>Schedule Name</span>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.frequency}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("frequency", e)}
                            className="py-2 px-3 text-center"
                          >
                            <span>Recurrence</span>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.amount}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("amount", e)}
                            className="py-2 px-3 text-right"
                          >
                            <span>Amount</span>
                          </ResizableTh>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-xs">
                        {filteredIncomeSources.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalMode("INCOME");
                                  setSourceToEdit({
                                    id: inc.id,
                                    name: inc.name,
                                    amount: inc.amount,
                                    receivingAccountId: inc.receivingAccountId || undefined,
                                    rrule: inc.rrule,
                                    startDate: inc.startDate,
                                  });
                                  setIsModalOpen(true);
                                }}
                                className="font-bold text-[#2563eb] hover:underline text-left"
                              >
                                {inc.name}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center text-zinc-500 font-semibold text-[11px]">
                              {inc.rrule ? "Recurring" : "One-off"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 tabular-nums">
                              ${parseFloat(inc.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Bill Schedules Card */}
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold text-[#1B2B4B] text-base">Bill Schedules</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("EXPENSE");
                      setSourceToEdit(undefined);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#1B2B4B] text-white rounded-xl font-bold text-xs shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    + Add Bill Schedule
                  </button>
                </div>

                {filteredExpenseSources.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-zinc-400">
                    No bill schedules found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <ResizableTh
                            width={setupWidths.name}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("name", e)}
                            className="py-2 px-3 text-left"
                          >
                            <span>Bill Name</span>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.accountOrPool}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("accountOrPool", e)}
                            className="py-2 px-3 text-left"
                          >
                            <span>Assigned Pool</span>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.amount}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("amount", e)}
                            className="py-2 px-3 text-right"
                          >
                            <span>Amount</span>
                          </ResizableTh>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-xs">
                        {filteredExpenseSources.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalMode("EXPENSE");
                                  setSourceToEdit({
                                    id: exp.id,
                                    name: exp.name,
                                    amount: exp.amount,
                                    poolId: exp.poolId || exp.categoryId || undefined,
                                    rrule: exp.rrule,
                                    startDate: exp.startDate,
                                  });
                                  setIsModalOpen(true);
                                }}
                                className="font-bold text-[#2563eb] hover:underline text-left"
                              >
                                {exp.name}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-left text-zinc-600 font-semibold text-[11px]">
                              {exp.poolName || "Pool"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 tabular-nums">
                              ${parseFloat(exp.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as "ALL" | "INCOME" | "EXPENSE")}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">All Types</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Bills Only</option>
              </select>
            </div>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-semibold">
              No pending scheduled events found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <ResizableTh
                      width={eventWidths.type}
                      onResizeMouseDown={(e: React.MouseEvent) => onEventMouseDown("type", e)}
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
                      width={eventWidths.name}
                      onResizeMouseDown={(e: React.MouseEvent) => onEventMouseDown("name", e)}
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
                      width={eventWidths.expectedDate}
                      onResizeMouseDown={(e: React.MouseEvent) => onEventMouseDown("expectedDate", e)}
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
                      width={eventWidths.expectedAmount}
                      onResizeMouseDown={(e: React.MouseEvent) => onEventMouseDown("expectedAmount", e)}
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
                      width={eventWidths.actions}
                      onResizeMouseDown={(e: React.MouseEvent) => onEventMouseDown("actions", e)}
                      className="py-3 px-4 text-center"
                    >
                      <span>Actions</span>
                    </ResizableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                  {sortedEvents.map((evt) => (
                    <tr
                      key={evt.id + evt.type}
                      className={`transition-colors ${
                        evt.isOverdue ? "bg-rose-50/30 hover:bg-rose-50/60" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          evt.type === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {evt.type === "INCOME" ? "Income" : "Bill"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-[#1B2B4B]">{evt.name}</td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-500">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{fmtDate(evt.expectedDate)}</span>
                          {evt.isOverdue && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black uppercase rounded-md border border-rose-200/80">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                        evt.type === "INCOME" ? "text-emerald-600" : "text-zinc-900"
                      }`}>
                        {evt.type === "INCOME" ? "+" : "-"}${evt.expectedAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleActionReceivedOrPaid(evt)}
                            className="px-2.5 py-1 bg-[#2563eb] text-white hover:bg-[#1d4ed8] rounded-lg font-extrabold text-[10px] transition-colors shadow-xs"
                          >
                            {evt.type === "INCOME" ? "Mark Received" : "Mark Paid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionSkip(evt)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition-colors border border-slate-200"
                          >
                            Skip
                          </button>
                        </div>
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

      <ConfirmDialog
        isOpen={!!eventToSkip}
        onClose={() => setEventToSkip(null)}
        onConfirm={confirmSkip}
        title={`Skip ${eventToSkip?.type === "INCOME" ? "Income" : "Bill"}`}
        description={t("common.skipConfirmationText", { defaultValue: "Mark this as Skipped to ignore this record. You can Unskip it later if you need to." })}
        confirmLabel="Skip Record"
        variant="warning"
      />
    </div>
  );
}

