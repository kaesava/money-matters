"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { useToast, Spinner, InfoTooltip, SearchInput, ResizableTh, useResizableColumns, Tabs } from "@money-matters/ui/web";
import IncomeExpenseFormModal from "../../../components/web/IncomeExpenseFormModal";
import PaydayPreviewModal from "../../../components/web/PaydayPreviewModal";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";
import { MatrixPlanTab } from "./components/MatrixPlanTab";
import { UpcomingTimelineTab } from "./components/UpcomingTimelineTab";

function IncomeAndBillsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "MATRIX";
  const typeParam = (searchParams.get("type") || "ALL").toUpperCase();

  const [activeTab, setActiveTab] = useState(tabParam);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    categoriesQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    expenseSourcesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading ||
    transferEventsQuery.isLoading;

  const rawPools = poolsQuery.data;
  const rawIncomeSources = incomeSourcesQuery.data;
  const rawExpenseSources = expenseSourcesQuery.data;

  const pools = useMemo(() => rawPools || [], [rawPools]);
  const incomeSources = useMemo(() => rawIncomeSources || [], [rawIncomeSources]);
  const expenseSources = useMemo(() => rawExpenseSources || [], [rawExpenseSources]);
  const rawIncomeEvents = incomeEventsQuery.data;
  const rawExpenseEvents = expenseEventsQuery.data;
  const rawTransferEvents = transferEventsQuery.data;

  const incomeEvents = useMemo(() => rawIncomeEvents || [], [rawIncomeEvents]);
  const expenseEvents = useMemo(() => rawExpenseEvents || [], [rawExpenseEvents]);
  const transferEvents = useMemo(() => rawTransferEvents || [], [rawTransferEvents]);

  const matrixIncomeEvents = useMemo(() => {
    return incomeEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => ({
        id: e.id,
        expectedDate: e.expectedDate,
        expectedAmount: parseFloat(e.expectedAmount || "0"),
        actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
        status: e.status as "UPCOMING" | "CONFIRMED" | "SKIPPED",
        sourceName: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Paycheck",
      }));
  }, [incomeEvents]);

  const matrixExpenseEvents = useMemo(() => {
    return expenseEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => ({
        categoryId: e.poolId || e.categoryId || "",
        amount: parseFloat(e.expectedAmount || "0"),
        dueDate: e.expectedDate,
        status: e.status as "UPCOMING" | "PAID" | "SKIPPED",
      }));
  }, [expenseEvents]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);
  const [selectedIncomeEventIdForModal, setSelectedIncomeEventIdForModal] = useState<string | null>(null);

  // Setup Tab Search State
  const [setupSearchQuery, setSetupSearchQuery] = useState("");

  const { widths: setupWidths, onMouseDown: onSetupMouseDown } = useResizableColumns({
    name: 220,
    frequency: 130,
    accountOrPool: 180,
    amount: 120,
  });

  // Action Mutations
  const markExpensePaidMut = trpc.markExpensePaid.useMutation();
  const skipIncomeMut = trpc.skipIncomeEvent.useMutation();
  const skipExpenseMut = trpc.skipExpenseEvent.useMutation();
  const executeTransferEventMut = trpc.executeTransferEvent.useMutation();
  const skipTransferEventMut = trpc.skipTransferEvent.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

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
        <div className="p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-sm">
          <UpcomingTimelineTab
            initialKindFilter={typeParam === "INCOME" || typeParam === "EXPENSE" || typeParam === "TRANSFER" ? typeParam : "ALL"}
            incomeEvents={incomeEvents.map((e) => ({
              ...e,
              name: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Income Deposit",
              isSkipped: e.status === "SKIPPED",
            }))}
            expenseEvents={expenseEvents.map((e) => ({
              ...e,
              name: e.name || "Scheduled Bill",
              categoryName: pools.find((p) => p.id === (e.poolId || e.categoryId))?.name || "Pool",
              isSkipped: e.status === "SKIPPED",
            }))}
            transferEvents={transferEvents.map((e) => ({
              ...e,
              name: e.name || "Pool Transfer",
              sourcePoolId: e.sourcePoolId,
              sourcePoolName: e.sourcePoolName,
              destinationPoolId: e.destinationPoolId,
              destinationPoolName: e.destinationPoolName,
              isSkipped: e.status === "SKIPPED",
            }))}
            categories={pools.map((p) => ({
              id: p.id,
              name: p.name,
              currentBalance: parseFloat(String(p.currentBalance || "0")),
            }))}
            searchQuery=""
            onMarkExpensePaid={async (eventId) => {
              try {
                await markExpensePaidMut.mutateAsync({ eventId });
                toast.success("Bill marked as paid.");
                utils.listExpenseEvents.invalidate();
                utils.listPools.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to mark paid.");
              }
            }}
            onMarkIncomeReceived={async (eventId) => {
              setSelectedIncomeEventIdForModal(eventId);
            }}
            onSkipExpense={async (eventId) => {
              try {
                await skipExpenseMut.mutateAsync({ eventId });
                toast.success("Bill skipped.");
                utils.listExpenseEvents.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to skip.");
              }
            }}
            onUnskipExpense={() => {}}
            onSkipIncome={async (eventId) => {
              try {
                await skipIncomeMut.mutateAsync({ eventId });
                toast.success("Income skipped.");
                utils.listIncomeEvents.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to skip.");
              }
            }}
            onUnskipIncome={() => {}}
            onSkipTransfer={async (eventId) => {
              try {
                await skipTransferEventMut.mutateAsync({ eventId });
                toast.success("Transfer skipped.");
                utils.listTransferEvents.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to skip.");
              }
            }}
            onExecuteTransfer={async (eventId, amount, date, sourcePoolId, destinationPoolId) => {
              try {
                await executeTransferEventMut.mutateAsync({ eventId, amount, sourcePoolId, destinationPoolId });
                toast.success("Transfer completed successfully!");
                utils.listTransferEvents.invalidate();
                utils.listPools.invalidate();
                utils.listTransactions.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to execute transfer.");
              }
            }}
            onOpenTransferModalWithData={() => {
              setIsTransferDrawerOpen(true);
            }}
            onConfirmTransferAndPay={async (sourceCategoryId, destinationCategoryId, amount) => {
              await moveMoneyMut.mutateAsync({
                sourcePoolId: sourceCategoryId,
                destinationPoolId: destinationCategoryId,
                amount,
                note: "Shortfall Top Up",
              });
              utils.listPools.invalidate();
            }}
          />
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

      {selectedIncomeEventIdForModal && (
        <PaydayPreviewModal
          isOpen={Boolean(selectedIncomeEventIdForModal)}
          incomeEventId={selectedIncomeEventIdForModal}
          onClose={() => setSelectedIncomeEventIdForModal(null)}
          onSuccess={() => {
            setSelectedIncomeEventIdForModal(null);
            utils.listIncomeEvents.invalidate();
            utils.listExpenseEvents.invalidate();
          }}
        />
      )}

      {isTransferDrawerOpen && (
        <QuickExpenseDrawer
          initialTab="TRANSFER"
          onClose={() => setIsTransferDrawerOpen(false)}
        />
      )}
    </div>
  );
}

export default function IncomeAndBillsPage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center"><Spinner /></div>}>
      <IncomeAndBillsContent />
    </Suspense>
  );
}
