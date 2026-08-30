"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, Spinner } from "@money-matters/ui/web";
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
  const incomeEvents = incomeEventsQuery.data || [];
  const expenseEvents = expenseEventsQuery.data || [];

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

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      utils.listIncomeSources.invalidate();
      utils.listIncomeEvents.invalidate();
    },
  });

  const handleArchive = useCallback(
    async (item: { id: string; name?: string }, mode: "INCOME" | "EXPENSE") => {
      const label = mode === "INCOME" ? "income stream" : "bill";
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
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B]">Income & Bill Management</h1>
          <p className="text-sm font-medium text-zinc-500 mt-0.5">
            Manage your recurring income schedules, bill commitments, and 12-month payday matrix.
          </p>
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
            + Add Income Stream
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

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab("MATRIX")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === "MATRIX"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          12-Month Cashflow Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("STREAMS")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === "STREAMS"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Income Streams & Bills ({incomeSources.length + expenseSources.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EVENTS")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === "EVENTS"
              ? "border-[#2563eb] text-[#2563eb]"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Upcoming Event Ledger ({incomeEvents.length + expenseEvents.length})
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
            monthlyAmount: parseFloat(p.everydayAllowanceAmount || p.targetAmount || "0"),
            enteredAmount: parseFloat(p.everydayAllowanceAmount || p.targetAmount || "0"),
            budgetFrequency: "MONTHLY",
            isEssential: true,
            isCommitted: p.isCommitted,
            isSurplusTarget: p.isSurplusTarget,
            waterfallPriority: (p as unknown as { waterfallPriority?: number }).waterfallPriority ?? 0,
          }))}
          incomeEvents={matrixIncomeEvents}
          expenseEvents={matrixExpenseEvents}
        />
      )}

      {activeTab === "STREAMS" && (
        <div className="flex flex-col gap-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Filter streams by name..."
            className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-bold text-[#1B2B4B] text-base mb-2">{`Income Streams (${incomeSources.length})`}</h3>
              <div className="divide-y divide-zinc-100 mt-3">
                {incomeSources.map((inc) => (
                  <div key={inc.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-[#1B2B4B] block">{inc.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">${parseFloat(inc.amount).toFixed(2)}</span>
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
        <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-bold text-[#1B2B4B] text-base mb-2">Upcoming Scheduled Events</h3>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 text-xs font-bold text-zinc-400 uppercase">
                <tr>
                  <th className="px-4 py-2">Event Name</th>
                  <th className="px-4 py-2">Expected Date</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {expenseEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td className="px-4 py-3 font-bold text-[#1B2B4B]">{evt.name}</td>
                    <td className="px-4 py-3">{evt.expectedDate}</td>
                    <td className="px-4 py-3 font-mono">${parseFloat(evt.expectedAmount).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-xs">{evt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
