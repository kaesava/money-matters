"use client";

import React, { useState } from "react";
import { ConfirmDialog } from "@money-matters/ui/web";

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
    const r = (rrule || "").toUpperCase();
    if (r.includes("FREQ=WEEKLY") && r.includes("INTERVAL=2")) frequencyLabel = "Fortnightly";
    else if (r.includes("FREQ=WEEKLY")) frequencyLabel = "Weekly";
    else if (r.includes("FREQ=MONTHLY")) frequencyLabel = "Monthly";
    else if (r.includes("FREQ=YEARLY")) frequencyLabel = "Annually";
    else frequencyLabel = "Recurring";
  }
  const dateLabel = fmtDate(startDate);
  return { isRecurring, frequencyLabel, dateLabel };
}

export interface SourceItem {
  id: string;
  name: string;
  amount: string | number;
  rrule?: string | null;
  startDate?: string | null;
  categoryName?: string;
  accountName?: string;
}

export interface EventItem {
  id: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount?: string | null;
  status: string;
  incomeSourceId?: string | null;
  expenseSourceId?: string | null;
  name?: string | null;
  note?: string | null;
}

export interface BurstModalProps {
  mode: "INCOME" | "EXPENSE";
  source: SourceItem;
  events: EventItem[];
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onMarkPaid: (eventId: string, amount: string, date: string) => void;
  onSkip: (eventId: string) => void;
  onUnskip?: (eventId: string) => void;
  onUpdateEvent: (eventId: string, amount: string, date: string) => void;
  isPendingMarkPaid: boolean;
  isPendingSkip?: boolean;
}

export function BurstModal({
  mode, source, events, onClose, onEdit, onArchive, onMarkPaid, onSkip, onUpdateEvent, isPendingMarkPaid,
}: BurstModalProps) {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
  const sched = parseSchedule(source.rrule, source.startDate);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${sched.isRecurring ? mode === "INCOME" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-[#2563eb] border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {sched.frequencyLabel}
              </span>
              {sched.dateLabel && <span className="text-[11px] text-zinc-500">{sched.isRecurring ? "Starting" : "Expected"} {sched.dateLabel}</span>}
              <span className={`font-mono font-extrabold text-sm ${mode === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                {mode === "INCOME" ? "+" : "−"}{fmt(source.amount)}
              </span>
              {mode === "EXPENSE" && source.categoryName && (
                <span className="text-[10px] font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">{source.categoryName}</span>
              )}
              {mode === "INCOME" && source.accountName && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-200">🏦 {source.accountName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button type="button" onClick={onEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors">
              {mode === "INCOME" ? "Edit Income" : "Edit Expense"}
            </button>
            <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors text-lg font-bold">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-3 px-1">
            {mode === "INCOME" ? "Scheduled Income" : "Scheduled Bills & Expenses"} ({sourceEvents.length})
          </h4>
          {sourceEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-zinc-100">No scheduled items for this source.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sourceEvents.map((evt) => {
                const isPaid = evt.status === "CONFIRMED";
                const isEditing = editingEventId === evt.id;
                const isFutureSaveMode = isEditing && isDateFuture(editDate);

                let statusIcon = "📅";
                let statusLabel = "";
                if (isPaid) { statusIcon = "✅"; statusLabel = mode === "INCOME" ? "Received" : "Paid"; }

                return (
                  <div key={evt.id} className={`rounded-xl border p-3.5 transition-colors ${isPaid ? "bg-emerald-50/40 border-emerald-100" : "bg-white border-zinc-100 hover:bg-zinc-50/50"}`}>
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
                        ) : (
                          <>
                            <button type="button" onClick={() => startEdit(evt)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                              Edit
                            </button>
                            <button type="button" onClick={() => setEventToDeleteId(evt.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-600 hover:bg-rose-600 hover:text-white border border-zinc-200 transition-colors">Delete</button>
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

        <div className="p-4 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50 rounded-b-2xl">
          <button type="button" onClick={onArchive} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Archive {mode === "INCOME" ? "Income" : "Expense"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 bg-zinc-100 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!eventToDeleteId}
        onClose={() => setEventToDeleteId(null)}
        onConfirm={() => {
          if (eventToDeleteId) {
            onSkip(eventToDeleteId);
            setEventToDeleteId(null);
          }
        }}
        title={mode === "INCOME" ? "Delete Income" : "Delete Expense"}
        description={mode === "INCOME" ? "Are you sure you want to Delete this Income?" : "Are you sure you want to Delete this Expense?"}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
