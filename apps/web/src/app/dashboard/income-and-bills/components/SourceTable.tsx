"use client";

import React, { useState, useEffect } from "react";
import { PaginationBar, useIconVisibility, fmtDate } from "@money-matters/ui/web";
import { BurstModal, SourceItem, EventItem } from "./BurstModal";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function SortHeader({
  label, sortKey, currentKey, dir, onSort, align = "left",
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors select-none group ${align === "right" ? "ml-auto justify-end" : ""}`}
    >
      {label}
      <span className={`ml-0.5 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
        {isActive && dir === "asc" ? "↑" : "↓"}
      </span>
    </button>
  );
}

export interface SourceTableProps {
  mode: "INCOME" | "EXPENSE";
  items: SourceItem[];
  bucketHeader: string;
  searchQuery: string;
  allIncomeEvents: EventItem[];
  allExpenseEvents: EventItem[];
  _categories?: { id: string; name: string }[];
  _bankAccounts?: { id: string; name: string }[];
  onAdd: () => void;
  onArchive: (item: SourceItem) => void;
  onEdit: (item: SourceItem) => void;
  onMarkPaid: (eventId: string, amount: string, date: string, sourceId: string) => void;
  onSkip: (eventId: string) => void;
  onUnskip: (eventId: string) => void;
  onUpdateEvent: (eventId: string, amount: string, date: string) => void;
  isPendingMarkPaid: boolean;
  isPendingSkip: boolean;
}

export function SourceTable({
  mode, items, bucketHeader, searchQuery, allIncomeEvents, allExpenseEvents,
  _categories, _bankAccounts, onAdd, onArchive, onEdit, onMarkPaid, onSkip, onUnskip, onUpdateEvent,
  isPendingMarkPaid, isPendingSkip,
}: SourceTableProps) {
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
        <h2 className={`text-base font-black flex items-center gap-2 ${isIncome ? "text-emerald-800" : "text-[#1B2B4B]"}`}>
          {showIcons && <span>{isIncome ? "💰" : "💸"}</span>}
          <span>{isIncome ? "Income" : "Bills & Expenses"}</span>
        </h2>
        <button type="button" onClick={onAdd} className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${isIncome ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" : "bg-[#1B2B4B] text-white hover:bg-slate-800"}`}>
          <span>➕</span>
          <span>{isIncome ? "Add Income" : "Add Expense"}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs font-semibold">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="px-5 py-3.5"><SortHeader label="Name" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5"><SortHeader label="Schedule" sortKey="schedule" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5"><SortHeader label={bucketHeader} sortKey="bucket" currentKey={sortKey} dir={sortDir} onSort={handleSort} /></th>
              <th className="px-5 py-3.5 text-right"><SortHeader label="Amount" sortKey="amount" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="right" /></th>
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
                    <button type="button" onClick={() => onEdit(item)} className="font-bold text-[#2563eb] hover:underline text-left cursor-pointer">{item.name}</button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => setBurstSource(item)}
                        className="self-start flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        title="Click to view scheduled event occurrences burst"
                      >
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1 ${sched.isRecurring ? isIncome ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-[#2563eb] border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          <span>📅</span>
                          <span>{sched.frequencyLabel}</span>
                        </span>
                      </button>
                      {sched.dateLabel && <span className="text-[11px] text-zinc-500 font-medium">{sched.isRecurring ? "Starting" : "Expected"} {fmtDate(item.startDate)}</span>}
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
