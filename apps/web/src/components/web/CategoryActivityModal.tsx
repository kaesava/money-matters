"use client";

import React, { useState } from "react";
import { trpc } from "../../lib/trpc";
import { fmtDate, Spinner } from "@money-matters/ui/web";
import { ModalDialog } from "./ModalDialog";

export interface CategoryActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: {
    id: string;
    name: string;
    type: "EVERYDAY" | "REGULAR" | "GOAL";
  } | null;
}

export function CategoryActivityModal({
  isOpen,
  onClose,
  category,
}: CategoryActivityModalProps) {
  const [activeTab, setActiveTab] = useState<"HISTORY" | "UPCOMING">("HISTORY");
  const utils = trpc.useUtils();

  const categoryId = category?.id ?? "";
  const txQuery = trpc.listCategoryTransactions.useQuery(
    { categoryId, limit: 50 },
    { enabled: isOpen && Boolean(categoryId) }
  );

  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: isOpen && Boolean(categoryId),
  });

  const markPaidMut = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      utils.listCategories.invalidate();
    },
  });

  const skipMut = trpc.skipExpenseEvent.useMutation({
    onSuccess: () => expenseEventsQuery.refetch(),
  });

  const unskipMut = trpc.unskipExpenseEvent.useMutation({
    onSuccess: () => expenseEventsQuery.refetch(),
  });

  if (!isOpen || !category) return null;

  const pastTransactions = txQuery.data ?? [];
  const upcomingEvents = (expenseEventsQuery.data ?? []).filter(
    (e) => e.categoryId === category.id
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Activity & History: ${category.name}`}
      subtitle="View past transactions and upcoming scheduled events for this category."
    >
      <div className="flex flex-col gap-4">
        {/* Tab Selection Header */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "HISTORY"
                ? "bg-white text-[#1B2B4B] shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            📜 Transaction History ({pastTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UPCOMING")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "UPCOMING"
                ? "bg-white text-[#1B2B4B] shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            📅 Upcoming Events ({upcomingEvents.length})
          </button>
        </div>

        {/* Tab 1: Past Transactions */}
        {activeTab === "HISTORY" && (
          <div className="flex flex-col gap-2 min-h-[220px] max-h-[360px] overflow-y-auto pr-1">
            {txQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400">
                <Spinner size="md" />
              </div>
            ) : pastTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic bg-zinc-50 rounded-xl border border-zinc-100">
                No past transactions recorded for this category.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200/80 overflow-hidden text-xs">
                {pastTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#1B2B4B]">
                        {tx.note || "Transaction"}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {fmtDate(tx.recordedAt)} • {tx.source || "MANUAL"}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold text-xs ${
                        tx.flowType === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {tx.flowType === "CREDIT" ? "+" : "−"}${parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upcoming Events */}
        {activeTab === "UPCOMING" && (
          <div className="flex flex-col gap-2 min-h-[220px] max-h-[360px] overflow-y-auto pr-1">
            {expenseEventsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400">
                <Spinner size="md" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic bg-zinc-50 rounded-xl border border-zinc-100">
                No upcoming events scheduled for this category.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-200/80 overflow-hidden text-xs">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#1B2B4B]">{evt.name}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        Due {fmtDate(evt.expectedDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-xs text-rose-600">
                        ${parseFloat(evt.expectedAmount).toFixed(2)}
                      </span>
                      {evt.status === "UPCOMING" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={markPaidMut.isPending}
                            onClick={() =>
                              markPaidMut.mutate({
                                eventId: evt.id,
                                actualAmount: evt.expectedAmount,
                                recordedAt: evt.expectedDate,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            Mark Paid
                          </button>
                          <button
                            type="button"
                            disabled={skipMut.isPending}
                            onClick={() => skipMut.mutate({ eventId: evt.id })}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                      {evt.status === "SKIPPED" && (
                        <button
                          type="button"
                          disabled={unskipMut.isPending}
                          onClick={() => unskipMut.mutate({ eventId: evt.id })}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                        >
                          Unskip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
