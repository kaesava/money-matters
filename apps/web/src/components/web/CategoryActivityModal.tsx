"use client";

import React, { useState } from "react";
import { Spinner } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { ModalDialog } from "./ModalDialog";
import { trpc } from "../../lib/trpc";
import { CategorySummaryItem } from "../../app/dashboard/pools/components/EverydayPoolSection";

interface CategoryActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategorySummaryItem | null;
}

export function CategoryActivityModal({
  isOpen,
  onClose,
  category,
}: CategoryActivityModalProps) {
  const [activeTab, setActiveTab] = useState<"HISTORY" | "UPCOMING">("HISTORY");
  const utils = trpc.useUtils();

  const poolId = category?.id ?? "";
  const txQuery = trpc.listCategoryTransactions.useQuery(
    { poolId, limit: 50 },
    { enabled: isOpen && Boolean(poolId) }
  );

  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, {
    enabled: isOpen && Boolean(poolId),
  });

  const markPaidMut = trpc.overrideEvent.useMutation({
    onSuccess: () => {
      expenseEventsQuery.refetch();
      utils.listPools.invalidate();
    },
  });

  if (!isOpen || !category) return null;

  const pastTransactions = txQuery.data ?? [];
  const upcomingEvents = (expenseEventsQuery.data ?? []).filter(
    (e) => e.poolId === category.id || e.categoryId === category.id
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${category.name} — Activity Ledger`}
      maxWidth="max-w-3xl"
    >
      <div className="flex border-b border-zinc-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-colors ${
            activeTab === "HISTORY"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Past Transactions ({pastTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("UPCOMING")}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-colors ${
            activeTab === "UPCOMING"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Upcoming Bills ({upcomingEvents.length})
        </button>
      </div>

      {activeTab === "HISTORY" ? (
        txQuery.isLoading ? (
          <div className="p-8 text-center"><Spinner /></div>
        ) : pastTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-zinc-400">
            {t("modals.categoryActivity.noHistory", { defaultValue: "No transactions recorded for this pool yet." })}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {pastTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-[#1B2B4B] block">{tx.note || "Transaction"}</span>
                  <span className="text-[10px] text-zinc-400">{tx.recordedAt} • {tx.source}</span>
                </div>
                <span className={`font-mono font-bold ${tx.flowType === "CREDIT" ? "text-emerald-600" : "text-zinc-800"}`}>
                  {tx.flowType === "CREDIT" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        expenseEventsQuery.isLoading ? (
          <div className="p-8 text-center"><Spinner /></div>
        ) : upcomingEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-zinc-400">
            {t("modals.categoryActivity.noUpcoming", { defaultValue: "No upcoming bills linked to this pool." })}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {upcomingEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-[#1B2B4B] block">{evt.name}</span>
                  <span className="text-[10px] text-zinc-400">Due: {evt.expectedDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-zinc-800">${parseFloat(evt.expectedAmount).toFixed(2)}</span>
                  {evt.status === "UPCOMING" ? (
                    <button
                      type="button"
                      onClick={() => {
                        markPaidMut.mutate({ eventId: evt.id, eventType: "EXPENSE", status: "PAID", actualAmount: evt.expectedAmount });
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                    >
                      {t("actions.markPaid", { defaultValue: "Mark Paid" })}
                    </button>
                  ) : (
                    <span className="font-bold text-[10px] uppercase text-zinc-400">{evt.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </ModalDialog>
  );
}
