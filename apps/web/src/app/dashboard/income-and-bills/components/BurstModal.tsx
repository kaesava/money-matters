"use client";

import React, { useState } from "react";
import { ModalDialog, ConfirmDialog, AmountField } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { t } from "@money-matters/i18n";

function parseSchedule(rrule?: string | null, startDate?: string | null, formatDate?: (d?: string | null) => string) {
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);
  let frequencyLabel = t("forms.oneOff");
  if (isRecurring) {
    const r = (rrule || "").toUpperCase();
    if (r.includes("FREQ=WEEKLY") && r.includes("INTERVAL=2")) frequencyLabel = t("forms.fortnightly");
    else if (r.includes("FREQ=WEEKLY")) frequencyLabel = t("forms.weekly");
    else if (r.includes("FREQ=MONTHLY")) frequencyLabel = t("forms.monthly");
    else if (r.includes("FREQ=YEARLY")) frequencyLabel = t("forms.yearly");
    else frequencyLabel = t("forms.recurring");
  }
  const dateLabel = formatDate && startDate ? formatDate(startDate) : startDate || "";
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
  const { fmt, fmtDate: formatLocaleDate, currency, currencySymbol, minorUnits, timezone: contextTz, userTimezone } = useLocale();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone || contextTz }).format(new Date());
  const sched = parseSchedule(source.rrule, source.startDate, formatLocaleDate);
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
    <>
      <ModalDialog
        isOpen={true}
        onClose={onClose}
        maxWidth="max-w-2xl"
        title={
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-black text-[#1B2B4B] truncate">{source.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${sched.isRecurring ? mode === "INCOME" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-[#2563eb] border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {sched.frequencyLabel}
              </span>
              {sched.dateLabel && (
                <span className="text-[11px] text-zinc-500">
                  {sched.isRecurring ? t("incomeBillsTabs.startingDate", { date: sched.dateLabel }) : t("incomeBillsTabs.expectedDateLabel", { date: sched.dateLabel })}
                </span>
              )}
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
        }
      >
        <div className="flex flex-col -m-6">
          <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
              {mode === "INCOME"
                ? t("incomeBillsTabs.scheduledIncomeCount", { count: sourceEvents.length })
                : t("incomeBillsTabs.scheduledExpensesCount", { count: sourceEvents.length })}
            </h4>
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors"
            >
              {mode === "INCOME" ? t("incomeBillsTabs.editIncomeSchedule") : t("incomeBillsTabs.editBillSchedule")}
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[55vh]">
            {sourceEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-zinc-100">
                {t("incomeBillsTabs.noScheduledItemsForSource")}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sourceEvents.map((evt) => {
                  const isPaid = evt.status === "CONFIRMED";
                  const isEditing = editingEventId === evt.id;
                  const isFutureSaveMode = isEditing && isDateFuture(editDate);

                  let statusIcon = "📅";
                  let statusLabel = "";
                  if (isPaid) { statusIcon = "✅"; statusLabel = mode === "INCOME" ? t("incomeBillsTabs.receivedBadge") : t("common.paid"); }

                  return (
                    <div key={evt.id} className={`rounded-xl border p-3.5 transition-colors ${isPaid ? "bg-emerald-50/40 border-emerald-100" : "bg-white border-zinc-100 hover:bg-zinc-50/50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{statusIcon}</span>
                          <div className="min-w-0">
                            {isEditing ? (
                              <input autoFocus={true} type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="px-2 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            ) : (
                              <p className="text-xs font-bold text-[#1B2B4B]">
                                {formatLocaleDate(evt.expectedDate)}
                                {statusLabel && <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>{statusLabel}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <div className="w-44">
                              <AmountField
                                value={editAmount}
                                onChange={setEditAmount}
                                allowNegative={false}
                                currency={currency}
                                currencySymbol={currencySymbol}
                                minorUnits={minorUnits}
                              />
                            </div>
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
                                {isFutureSaveMode ? t("common.save") : mode === "INCOME" ? t("incomeBillsTabs.markReceived") : t("actions.markPaid")}
                              </button>
                              <button type="button" onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">{t("common.cancel")}</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(evt)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                                {t("common.edit")}
                              </button>
                              <button type="button" onClick={() => setEventToDeleteId(evt.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-600 hover:bg-rose-600 hover:text-white border border-zinc-200 transition-colors">{t("common.delete")}</button>
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

          <div className="p-4 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <button type="button" onClick={onArchive} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
              {mode === "INCOME" ? t("incomeBillsTabs.archiveIncome") : t("incomeBillsTabs.archiveExpense")}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 bg-zinc-100 rounded-xl transition-colors">
              {t("common.close")}
            </button>
          </div>
        </div>
      </ModalDialog>

      <ConfirmDialog
        isOpen={!!eventToDeleteId}
        onClose={() => setEventToDeleteId(null)}
        onConfirm={() => {
          if (eventToDeleteId) {
            onSkip(eventToDeleteId);
            setEventToDeleteId(null);
          }
        }}
        title={mode === "INCOME" ? t("common.deleteIncomeTitle") : t("common.deleteExpenseTitle")}
        description={t("incomeBillsTabs.deleteEventConfirmPrompt")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </>
  );
}
