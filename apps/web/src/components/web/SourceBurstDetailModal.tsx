"use client";
import React from "react";
import { trpc } from "../../lib/trpc";
import { ModalDialog } from "./ModalDialog";
import { fmtDate } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

export interface SourceBurstDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "INCOME" | "EXPENSE";
  sourceId: string | null;
  sourceName?: string;
  sourceAmount?: string;
  categoryName?: string;
}

export const SourceBurstDetailModal: React.FC<SourceBurstDetailModalProps> = ({
  isOpen,
  onClose,
  mode,
  sourceId,
  sourceName,
  sourceAmount,
  categoryName,
}) => {
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, {
    enabled: isOpen && !!sourceId && mode === "INCOME",
  });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: isOpen && !!sourceId && mode === "EXPENSE",
  });

  if (!isOpen || !sourceId) return null;

  const fmt = (numStr?: string) => {
    if (!numStr) return "$0.00";
    const num = parseFloat(numStr);
    return isNaN(num) ? "$0.00" : `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
  };

  interface EventItem {
    id: string;
    incomeSourceId?: string | null;
    expenseSourceId?: string | null;
    expectedDate: string;
    status: string;
    expectedAmount?: string;
    actualAmount?: string | null;
  }

  const allEvents: EventItem[] = (mode === "INCOME" ? (incomeEventsQuery.data ?? []) : (expenseEventsQuery.data ?? [])) as unknown as EventItem[];
  const sourceEvents = allEvents.filter((e: EventItem) =>
    mode === "INCOME" ? e.incomeSourceId === sourceId : e.expenseSourceId === sourceId
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${mode === "INCOME" ? "Income Deposit" : "Expense Obligation"}: ${sourceName || "Detail"}`}
      subtitle={`12-Month Rolling Upcoming Events & History`}
      maxWidthClass="max-w-xl"
    >
      <div className="flex flex-col gap-5">
        {/* Top Summary Banner */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase">{t("payday.standardAmount")}</p>
            <p className="text-xl font-black text-[#1B2B4B]">{sourceAmount ? fmt(sourceAmount) : "—"}</p>
          </div>
          {categoryName && (
            <div className="text-right">
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase">{t("payday.assignedCategory")}</p>
              <p className="text-xs font-extrabold text-[#00B4A6] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block mt-0.5">
                {categoryName}
              </p>
            </div>
          )}
        </div>

        {/* Burst Upcoming Events List */}
        <div>
          <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider mb-2">
            Scheduled Upcoming & Past Events ({sourceEvents.length})
          </h4>

          {sourceEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-zinc-100">
              {t("payday.noEventsForSource")}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
              {sourceEvents.map((evt: EventItem) => {
                const isPaid = evt.status === "PAID";
                const isOverdue = !isPaid && new Date(evt.expectedDate) < new Date();

                return (
                  <div key={evt.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{isPaid ? "✅" : isOverdue ? "⚠️" : "📅"}</span>
                      <div>
                        <p className="font-bold text-[#1B2B4B]">
                          {fmtDate(evt.expectedDate)} {isOverdue && <span className="text-rose-500 font-bold ml-1">(Overdue)</span>}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">Status: {evt.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-[#1B2B4B]">{fmt(evt.actualAmount || evt.expectedAmount)}</p>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : isOverdue
                            ? "bg-rose-100 text-rose-800"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
