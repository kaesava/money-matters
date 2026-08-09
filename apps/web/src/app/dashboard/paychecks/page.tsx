"use client";

import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { PaginationBar } from "@money-matters/ui/web";
import { IncomeExpenseFormModal } from "../../../components/web/IncomeExpenseFormModal";
import { useIconVisibility } from "@money-matters/ui";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dStr?: string | null): string {
  if (!dStr) return "";
  const parts = dStr.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
}

function parseSchedule(rrule?: string | null, startDate?: string | null) {
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);
  let frequencyLabel = "One-off";
  if (isRecurring) {
    if (rrule?.includes("INTERVAL=2") && rrule?.includes("WEEKLY")) frequencyLabel = "Fortnightly";
    else if (rrule?.includes("FREQ=WEEKLY")) frequencyLabel = "Weekly";
    else if (rrule?.includes("FREQ=MONTHLY")) frequencyLabel = "Monthly";
    else if (rrule?.includes("FREQ=YEARLY") || rrule?.includes("ANNUALLY")) frequencyLabel = "Annually";
    else frequencyLabel = "Recurring";
  }
  const dateLabel = startDate ? fmtDate(startDate) : null;
  return { isRecurring, frequencyLabel, dateLabel };
}

type SortDir = "asc" | "desc";
type SortKey = "name" | "amount" | "schedule" | "bucket";

interface SourceItem {
  id: string;
  name: string;
  amount: string;
  rrule?: string | null;
  startDate?: string | null;
  categoryId?: string | null;
  receivingAccountId?: string | null;
  categoryName?: string | null;
  accountName?: string;
}

interface EventItem {
  id: string;
  incomeSourceId?: string | null;
  expenseSourceId?: string | null;
  status: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount?: string | null;
  note?: string | null;
  name?: string | null;
}

function SortHeader({
  label, sortKey, currentKey, dir, onSort,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors select-none group"
    >
      {label}
      <span className={`ml-0.5 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
        {isActive && dir === "asc" ? "↑" : "↓"}
      </span>
    </button>
  );
}

function BurstModal({
  mode, source, events, onClose, onEdit, onArchive, onMarkPaid, onSkip, onUnskip, onUpdateEvent, isPendingMarkPaid, isPendingSkip,
}: {
  mode: "INCOME" | "EXPENSE";
  source: SourceItem;
  events: EventItem[];
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onMarkPaid: (eventId: string, amount: string, date: string) => void;
  onSkip: (eventId: string) => void;
  onUnskip: (eventId: string) => void;
  onUpdateEvent: (eventId: string, amount: string, date: string) => void;
  isPendingMarkPaid: boolean;
  isPendingSkip: boolean;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const sched = parseSchedule(source.rrule, source.startDate);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  const startEdit = (evt: EventItem) => {
    setEditingEventId(evt.id);
    setEditAmount(parseFloat(evt.expectedAmount).toFixed(2));
    setEditDate(evt.expectedDate);
  };
  const cancelEdit = () => setEditingEventId(null);
  const isDateFuture = (d: string) => d > todayStr;

  const sourceEvents = events.filter((e) =>
    mode === "INCOME" ? e.incomeSourceId === source.id : e.expenseSourceId === source.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh] z-10">
        <div className="flex items-start justify-between p-6 border-b border-zinc-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-[#1B2B4B] truncate">{source.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${sched.isRecurring ? mode === "INCOME" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-teal-50 text-teal-700 border-teal-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {sched.frequencyLabel}
              </span>
              {sched.dateLabel && <span className="text-[11px] text-zinc-500">{sched.isRecurring ? "Kicks off" : "Expected"} {sched.dateLabel}</span>}
              <span className={`font-mono font-extrabold text-sm ${mode === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                {mode === "INCOME" ? "+" : "−"}{fmt(source.amount)}
              </span>
              {mode === "EXPENSE" && source.categoryName && (
                <span className="text-[10px] font-bold text-[#00B4A6] bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">{source.categoryName}</span>
              )}
              {mode === "INCOME" && source.accountName && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-200">🏦 {source.accountName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button type="button" onClick={onEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors">Edit Source</button>
            <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors text-lg font-bold">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-3 px-1">Scheduled Events ({sourceEvents.length})</h4>
          {sourceEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-zinc-100">No scheduled events for this source.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sourceEvents.map((evt) => {
                const isPaid = evt.status === "PAID";
                const isSkipped = evt.status === "SKIPPED";
                const isEditing = editingEventId === evt.id;
                const isFutureSaveMode = isEditing && isDateFuture(editDate);

                let statusIcon = "📅";
                let statusLabel = "";
                if (isPaid) { statusIcon = "✅"; statusLabel = mode === "INCOME" ? "Received" : "Paid"; }
                else if (isSkipped) { statusIcon = "⏭️"; statusLabel = "Skipped"; }

                return (
                  <div key={evt.id} className={`rounded-xl border p-3.5 transition-colors ${isPaid ? "bg-emerald-50/40 border-emerald-100" : isSkipped ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-white border-zinc-100 hover:bg-zinc-50/50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{statusIcon}</span>
                        <div className="min-w-0">
                          {isEditing ? (
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="px-2 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          ) : (
                            <p className="text-xs font-bold text-[#1B2B4B]">
                              {fmtDate(evt.expectedDate)}
                              {statusLabel && <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>{statusLabel}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isEditing ? (
                          <input type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-24 px-2 py-1 text-xs font-mono border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                        ) : (
                          <span className="font-mono font-extrabold text-xs text-[#1B2B4B]">{fmt(evt.actualAmount || evt.expectedAmount)}</span>
                        )}
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await onUpdateEvent(evt.id, editAmount, editDate);
                                if (!isFutureSaveMode) {
                                  onMarkPaid(evt.id, editAmount, editDate);
                                }
                                cancelEdit();
                              }}
                              disabled={isPendingMarkPaid}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${isFutureSaveMode ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                            >
                              {isFutureSaveMode ? "Save" : mode === "INCOME" ? "Mark Received" : "Mark Paid"}
                            </button>
                            <button type="button" onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">Cancel</button>
                          </>
                        ) : isSkipped ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUnskip(evt.id);
                              startEdit(evt);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Unskip
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(evt)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                              Edit
                            </button>
                            <button type="button" onClick={() => onSkip(evt.id)} disabled={isPendingSkip} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 transition-colors">Skip</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with subtle Archive action */}
        <div className="p-4 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50 rounded-b-2xl">
          <button type="button" onClick={onArchive} className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline transition-colors">
            Archive {mode === "INCOME" ? "Income Source" : "Expense Bill"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-xl text-xs font-bold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceTable({
  mode, items, bucketHeader, searchQuery, allIncomeEvents, allExpenseEvents,
  categories, bankAccounts, onAdd, onArchive, onEdit, onMarkPaid, onSkip, onUnskip, onUpdateEvent,
  isPendingMarkPaid, isPendingSkip,
}: {
  mode: "INCOME" | "EXPENSE";
  items: SourceItem[];
  bucketHeader: string;
  searchQuery: string;
  allIncomeEvents: EventItem[];
  allExpenseEvents: EventItem[];
  categories: { id: string; name: string }[];
  bankAccounts: { id: string; name: string }[];
  onAdd: () => void;
  onArchive: (item: SourceItem) => void;
  onEdit: (item: SourceItem) => void;
  onMarkPaid: (eventId: string, amount: string, date: string, sourceId: string) => void;
  onSkip: (eventId: string) => void;
  onUnskip: (eventId: string) => void;
  onUpdateEvent: (eventId: string, amount: string, date: string) => void;
  isPendingMarkPaid: boolean;
  isPendingSkip: boolean;
}) {
  const { showIcons } = useIconVisibility();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [burstSource, setBurstSource] = useState<SourceItem | null>(null);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const bucket = mode === "INCOME" ? item.accountName : item.categoryName;
    return item.name.toLowerCase().includes(q) || (bucket || "").toLowerCase().includes(q) || item.amount.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "amount") cmp = parseFloat(a.amount) - parseFloat(b.amount);
    else if (sortKey === "schedule") cmp = parseSchedule(a.rrule, a.startDate).frequencyLabel.localeCompare(parseSchedule(b.rrule, b.startDate).frequencyLabel);
    else if (sortKey === "bucket") cmp = (mode === "INCOME" ? (a.accountName || "") : (a.categoryName || "")).localeCompare(mode === "INCOME" ? (b.accountName || "") : (b.categoryName || ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const allEvents = mode === "INCOME" ? allIncomeEvents : allExpenseEvents;
  const isIncome = mode === "INCOME";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-base font-black ${isIncome ? "text-emerald-800" : "text-[#1B2B4B]"}`}>
          {isIncome ? "↑ Upcoming Income" : "↓ Upcoming Bills & Expenses"}
        </h2>
        <button type="button" onClick={onAdd} className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${isIncome ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" : "bg-[#1B2B4B] text-white hover:bg-[#2c3e5f]"}`}>
          <span>➕</span>
          <span>{isIncome ? "Add Upcoming Income" : "Add Upcoming Expense"}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs font-semibold">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="px-5 py-3.5"><SortHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5"><SortHeader label="Schedule" sortKey="schedule" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5"><SortHeader label={bucketHeader} sortKey="bucket" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5 text-right"><SortHeader label="Amount" sortKey="amount" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-xs text-zinc-400 font-medium">
                  {filtered.length === 0 && items.length > 0 ? "No matches found." : `No ${isIncome ? "income sources" : "expense bills"} set up yet.`}
                </td>
              </tr>
            ) : paginated.map((item) => {
              const sched = parseSchedule(item.rrule, item.startDate);
              const bucket = isIncome ? item.accountName : item.categoryName;
              return (
                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <button type="button" onClick={() => setBurstSource(item)} className="font-bold text-[#00B4A6] hover:underline text-left">{item.name}</button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className={`self-start px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${sched.isRecurring ? isIncome ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-teal-50 text-teal-700 border-teal-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {sched.frequencyLabel}
                      </span>
                      {sched.dateLabel && <span className="text-[11px] text-zinc-500 font-medium">{sched.isRecurring ? "Kicks off" : "Expected"} {sched.dateLabel}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {showIcons && <span className="mr-1">{isIncome ? "🏦" : "📁"}</span>}
                    {bucket || (isIncome ? "Main Account" : "Uncategorized")}
                  </td>
                  <td className={`px-5 py-3.5 text-right font-mono font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                    {isIncome ? "+" : "−"}{fmt(item.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationBar page={page} totalPages={totalPages} pageSize={pageSize} totalItems={sorted.length} pageSizeOptions={[10, 25, 50]} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />

      {burstSource && (
        <BurstModal
          mode={mode}
          source={burstSource}
          events={allEvents}
          onClose={() => setBurstSource(null)}
          onEdit={() => { setBurstSource(null); onEdit(burstSource); }}
          onArchive={() => { setBurstSource(null); onArchive(burstSource); }}
          onMarkPaid={(eventId, amount, date) => onMarkPaid(eventId, amount, date, burstSource.id)}
          onSkip={onSkip}
          onUnskip={onUnskip}
          onUpdateEvent={onUpdateEvent}
          isPendingMarkPaid={isPendingMarkPaid}
          isPendingSkip={isPendingSkip}
        />
      )}
    </div>
  );
}

export default function InsAndOutsPage() {
  const utils = trpc.useUtils();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const incomeEvents = (incomeEventsQuery.data ?? []) as EventItem[];
  const expenseEvents = (expenseEventsQuery.data ?? []) as EventItem[];

  const incomeItems: SourceItem[] = (incomeSourcesQuery.data ?? []).map((inc) => ({
    id: inc.id, name: inc.name, amount: inc.amount, rrule: inc.rrule, startDate: inc.startDate,
    receivingAccountId: inc.receivingAccountId,
    accountName: bankAccounts.find((a) => a.id === inc.receivingAccountId)?.name || "Main Account",
  }));

  const expenseItems: SourceItem[] = (expenseSourcesQuery.data ?? []).map((exp) => ({
    id: exp.id, name: exp.name, amount: exp.amount, rrule: exp.rrule, startDate: exp.startDate,
    categoryId: exp.categoryId,
    categoryName: categories.find((c) => c.id === exp.categoryId)?.name || "Uncategorized",
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({ onSuccess: () => { utils.listIncomeSources.invalidate(); utils.listIncomeEvents.invalidate(); } });
  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation({ onSuccess: () => { utils.listExpenseSources.invalidate(); utils.listExpenseEvents.invalidate(); } });
  const markExpensePaidMut = trpc.markExpensePaid.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); utils.listCategories.invalidate(); } });
  const skipExpenseEventMut = trpc.skipExpenseEvent.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });
  const updateExpenseEventMut = trpc.updateUpcomingExpense.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });

  const unskipExpenseEventMut = trpc.unskipExpenseEvent.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });

  const handleArchive = useCallback(async (item: SourceItem, mode: "INCOME" | "EXPENSE") => {
    const label = mode === "INCOME" ? "income stream" : "bill";
    if (!confirm(`Archiving this ${label} will cancel all future upcoming events. Continue?`)) return;
    try {
      if (mode === "INCOME") { await archiveIncomeMut.mutateAsync({ id: item.id }); posthog.capture("income_source_archived"); }
      else { await archiveExpenseMut.mutateAsync({ id: item.id }); posthog.capture("expense_source_archived"); }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to archive."); }
  }, [archiveIncomeMut, archiveExpenseMut]);

  const handleEdit = useCallback((item: SourceItem, mode: "INCOME" | "EXPENSE") => {
    setModalMode(mode);
    setSourceToEdit({ id: item.id, name: item.name, amount: item.amount, categoryId: item.categoryId, receivingAccountId: item.receivingAccountId, rrule: item.rrule, startDate: item.startDate });
    setIsModalOpen(true);
  }, []);

  const handleMarkPaid = useCallback((eventId: string, amount: string, date: string) => {
    markExpensePaidMut.mutate({ eventId, actualAmount: parseFloat(amount).toFixed(2), recordedAt: date });
  }, [markExpensePaidMut]);

  const handleSkip = useCallback((eventId: string) => { skipExpenseEventMut.mutate({ eventId }); }, [skipExpenseEventMut]);

  const handleUnskip = useCallback((eventId: string) => { unskipExpenseEventMut.mutate({ eventId }); }, [unskipExpenseEventMut]);

  const handleUpdateEvent = useCallback(async (eventId: string, amount: string, date: string) => {
    await updateExpenseEventMut.mutateAsync({ eventId, expectedAmount: parseFloat(amount).toFixed(2), expectedDate: date });
  }, [updateExpenseEventMut]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Ins &amp; Outs</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-0.5">Set up upcoming income and upcoming expenses.</p>
      </div>

      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name, category, or account..." className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6] placeholder:text-zinc-400 font-semibold" />
        {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold">✕</button>}
      </div>

      <SourceTable
        mode="INCOME" items={incomeItems} bucketHeader="Account" searchQuery={searchQuery}
        allIncomeEvents={incomeEvents} allExpenseEvents={expenseEvents}
        categories={categories} bankAccounts={bankAccounts}
        onAdd={() => { setModalMode("INCOME"); setSourceToEdit(null); setIsModalOpen(true); }}
        onArchive={(item) => handleArchive(item, "INCOME")}
        onEdit={(item) => handleEdit(item, "INCOME")}
        onMarkPaid={() => {}}
        onSkip={() => {}}
        onUnskip={() => {}}
        onUpdateEvent={() => {}}
        isPendingMarkPaid={false}
        isPendingSkip={false}
      />

      <SourceTable
        mode="EXPENSE" items={expenseItems} bucketHeader="Category" searchQuery={searchQuery}
        allIncomeEvents={incomeEvents} allExpenseEvents={expenseEvents}
        categories={categories} bankAccounts={bankAccounts}
        onAdd={() => { setModalMode("EXPENSE"); setSourceToEdit(null); setIsModalOpen(true); }}
        onArchive={(item) => handleArchive(item, "EXPENSE")}
        onEdit={(item) => handleEdit(item, "EXPENSE")}
        onMarkPaid={handleMarkPaid}
        onSkip={handleSkip}
        onUnskip={handleUnskip}
        onUpdateEvent={handleUpdateEvent}
        isPendingMarkPaid={markExpensePaidMut.isPending}
        isPendingSkip={skipExpenseEventMut.isPending}
      />

      <IncomeExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        sourceToEdit={sourceToEdit}
        onSuccess={() => {
          utils.listIncomeSources.invalidate();
          utils.listExpenseSources.invalidate();
          utils.listIncomeEvents.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />
    </div>
  );
}
