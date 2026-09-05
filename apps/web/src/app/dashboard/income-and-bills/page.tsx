"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import {
  useToast,
  Spinner,
  InfoTooltip,
  SearchInput,
  ResizableTh,
  useResizableColumns,
  Tabs,
} from "@money-matters/ui/web";
import IncomeExpenseFormModal from "../../../components/web/IncomeExpenseFormModal";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";
import { MatrixPlanTab } from "./components/MatrixPlanTab";
import { UpcomingTimelineTab } from "./components/UpcomingTimelineTab";
import { PaydayActionDrawer } from "../../../components/web/PaydayActionDrawer";

function IncomeAndBillsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "MATRIX";
  const typeParam = (searchParams.get("type") || "ALL").toUpperCase();

  const [activeTab, setActiveTab] = useState(tabParam);
  const [paydayActionMode, setPaydayActionMode] = useState<"MARK_RECEIVED" | "ALLOCATE">("MARK_RECEIVED");
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const toast = useToast();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    categoriesQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    expenseSourcesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading ||
    transferEventsQuery.isLoading;

  const rawPools = poolsQuery.data;
  const rawBankAccounts = bankAccountsQuery.data;
  const rawIncomeSources = incomeSourcesQuery.data;
  const rawExpenseSources = expenseSourcesQuery.data;

  const pools = useMemo(() => rawPools || [], [rawPools]);
  const bankAccounts = useMemo(() => rawBankAccounts || [], [rawBankAccounts]);
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

  // Setup Tab State (Search & Scope Filter)
  const [setupSearchQuery, setSetupSearchQuery] = useState("");
  const [setupScopeFilter, setSetupScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [selectedIncomeBankAccountId, setSelectedIncomeBankAccountId] = useState("");
  const [selectedExpensePoolId, setSelectedExpensePoolId] = useState("");

  // Setup Tables Sorting State
  const [incSortField, setIncSortField] = useState<"name" | "account" | "amount">("name");
  const [incSortOrder, setIncSortOrder] = useState<"asc" | "desc">("asc");
  const [expSortField, setExpSortField] = useState<"name" | "pool" | "amount">("name");
  const [expSortOrder, setExpSortOrder] = useState<"asc" | "desc">("asc");

  const { widths: setupWidths, onMouseDown: onSetupMouseDown } = useResizableColumns({
    name: 220,
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

  // Setup Tab Filtered & Sorted Income Schedules
  const filteredIncomeSources = useMemo(() => {
    let result = incomeSources.map((inc) => {
      const acct = bankAccounts.find((b) => b.id === inc.receivingAccountId);
      return {
        ...inc,
        accountName: acct?.name || "Main Account",
        isPrivate: acct?.isPrivate || false,
      };
    });

    if (setupScopeFilter === "PRIVATE") result = result.filter((inc) => inc.isPrivate);
    if (setupScopeFilter === "SHARED") result = result.filter((inc) => !inc.isPrivate);

    if (selectedIncomeBankAccountId) {
      result = result.filter((inc) => inc.receivingAccountId === selectedIncomeBankAccountId);
    }

    if (setupSearchQuery.trim()) {
      const q = setupSearchQuery.toLowerCase().trim();
      result = result.filter(
        (inc) =>
          inc.name.toLowerCase().includes(q) ||
          inc.accountName.toLowerCase().includes(q) ||
          String(inc.amount).includes(q)
      );
    }

    return result.sort((a, b) => {
      let comp = 0;
      if (incSortField === "name") comp = a.name.localeCompare(b.name);
      else if (incSortField === "account") comp = a.accountName.localeCompare(b.accountName);
      else if (incSortField === "amount") comp = parseFloat(a.amount) - parseFloat(b.amount);
      return incSortOrder === "asc" ? comp : -comp;
    });
  }, [incomeSources, bankAccounts, setupScopeFilter, selectedIncomeBankAccountId, setupSearchQuery, incSortField, incSortOrder]);

  // Setup Tab Filtered & Sorted Expense Schedules
  const filteredExpenseSources = useMemo(() => {
    let result = expenseSources.map((exp) => {
      const pool = pools.find((p) => p.id === (exp.poolId || exp.categoryId));
      return {
        ...exp,
        poolName: exp.poolName || pool?.name || "Uncategorized",
        isPrivate: pool?.isPrivate || false,
      };
    });

    if (setupScopeFilter === "PRIVATE") result = result.filter((exp) => exp.isPrivate);
    if (setupScopeFilter === "SHARED") result = result.filter((exp) => !exp.isPrivate);

    if (selectedExpensePoolId) {
      result = result.filter((exp) => (exp.poolId || exp.categoryId) === selectedExpensePoolId);
    }

    if (setupSearchQuery.trim()) {
      const q = setupSearchQuery.toLowerCase().trim();
      result = result.filter(
        (exp) =>
          exp.name.toLowerCase().includes(q) ||
          exp.poolName.toLowerCase().includes(q) ||
          String(exp.amount).includes(q)
      );
    }

    return result.sort((a, b) => {
      let comp = 0;
      if (expSortField === "name") comp = a.name.localeCompare(b.name);
      else if (expSortField === "pool") comp = a.poolName.localeCompare(b.poolName);
      else if (expSortField === "amount") comp = parseFloat(a.amount) - parseFloat(b.amount);
      return expSortOrder === "asc" ? comp : -comp;
    });
  }, [expenseSources, pools, setupScopeFilter, selectedExpensePoolId, setupSearchQuery, expSortField, expSortOrder]);

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
        <h1 className="text-2xl font-black text-[#1B2B4B]">{t("tooltips.incomeBills.title", { defaultValue: "Income & Expenses" })}</h1>
        <InfoTooltip
          title={t("tooltips.incomeBills.title", { defaultValue: "Income & Expenses" })}
          content={t("tooltips.incomeBills.content", { defaultValue: "Manage schedules and your upcoming income & expenses" })}
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
          {/* Top Control Bar: Unified Search + Scope Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <div className="w-full md:w-72">
              <SearchInput
                value={setupSearchQuery}
                onChange={setSetupSearchQuery}
                placeholder="Search income or expense schedules..."
              />
            </div>

            {/* Scope Filter Pills */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSetupScopeFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  setupScopeFilter === "ALL"
                    ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSetupScopeFilter("SHARED")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  setupScopeFilter === "SHARED"
                    ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Shared
              </button>
              <button
                type="button"
                onClick={() => setSetupScopeFilter("PRIVATE")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  setupScopeFilter === "PRIVATE"
                    ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Private
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Schedules Card */}
            <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">Income Schedules</h3>

                  <div className="flex items-center gap-2">
                    {/* Bank Account Dropdown Filter */}
                    <select
                      value={selectedIncomeBankAccountId}
                      onChange={(e) => setSelectedIncomeBankAccountId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <option value="">All Bank Accounts</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>

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
                </div>

                {filteredIncomeSources.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-zinc-400">
                    No income schedules found matching filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-700/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <ResizableTh
                            width={setupWidths.name}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("name", e)}
                            className="py-2 px-3 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIncSortField("name");
                                setIncSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 font-bold hover:text-zinc-700"
                            >
                              <span>SCHEDULE NAME</span>
                              {incSortField === "name" && (incSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.accountOrPool}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("accountOrPool", e)}
                            className="py-2 px-3 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIncSortField("account");
                                setIncSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 font-bold hover:text-zinc-700"
                            >
                              <span>BANK ACCOUNT</span>
                              {incSortField === "account" && (incSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.amount}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("amount", e)}
                            className="py-2 px-3 text-right"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIncSortField("amount");
                                setIncSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 justify-end font-bold hover:text-zinc-700 w-full"
                            >
                              <span>AMOUNT</span>
                              {incSortField === "amount" && (incSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                        {filteredIncomeSources.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-2.5 px-3 text-left">
                              <div className="flex flex-col gap-0.5">
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
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  {inc.rrule ? "Recurring schedule" : "One-off deposit"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-left text-zinc-600 dark:text-zinc-300 font-semibold text-[11px]">
                              {inc.accountName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
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

            {/* Expense Schedules Card */}
            <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold text-[#1B2B4B] dark:text-white text-base">Expense Schedules</h3>

                  <div className="flex items-center gap-2">
                    {/* Pool Dropdown Filter */}
                    <select
                      value={selectedExpensePoolId}
                      onChange={(e) => setSelectedExpensePoolId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <option value="">All Pools</option>
                      {pools.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setModalMode("EXPENSE");
                        setSourceToEdit(undefined);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#1B2B4B] dark:bg-zinc-800 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-slate-800 transition-colors"
                    >
                      + Add Expense Schedule
                    </button>
                  </div>
                </div>

                {filteredExpenseSources.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-zinc-400">
                    No expense schedules found matching filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-700/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          <ResizableTh
                            width={setupWidths.name}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("name", e)}
                            className="py-2 px-3 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setExpSortField("name");
                                setExpSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 font-bold hover:text-zinc-700"
                            >
                              <span>SCHEDULE NAME</span>
                              {expSortField === "name" && (expSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.accountOrPool}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("accountOrPool", e)}
                            className="py-2 px-3 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setExpSortField("pool");
                                setExpSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 font-bold hover:text-zinc-700"
                            >
                              <span>ASSIGNED POOL</span>
                              {expSortField === "pool" && (expSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                          <ResizableTh
                            width={setupWidths.amount}
                            onResizeMouseDown={(e: React.MouseEvent) => onSetupMouseDown("amount", e)}
                            className="py-2 px-3 text-right"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setExpSortField("amount");
                                setExpSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                              }}
                              className="flex items-center gap-1 justify-end font-bold hover:text-zinc-700 w-full"
                            >
                              <span>AMOUNT</span>
                              {expSortField === "amount" && (expSortOrder === "asc" ? "↑" : "↓")}
                            </button>
                          </ResizableTh>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                        {filteredExpenseSources.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-2.5 px-3 text-left">
                              <div className="flex flex-col gap-0.5">
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
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  {exp.rrule ? "Recurring schedule" : "One-off expense"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-left text-zinc-600 dark:text-zinc-300 font-semibold text-[11px]">
                              {exp.poolName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
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
        <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <UpcomingTimelineTab
            isLoading={isLoading}
            initialKindFilter={typeParam === "INCOME" || typeParam === "EXPENSE" || typeParam === "TRANSFER" ? typeParam : "ALL"}
            incomeEvents={incomeEvents.map((e) => {
              const receivingAccountId = (e as unknown as { receivingAccountId?: string }).receivingAccountId;
              const acct = bankAccounts.find((b) => b.id === receivingAccountId);
              return {
                ...e,
                name: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Income Deposit",
                accountName: acct?.name || "Bank Account",
                isPrivate: acct?.isPrivate || false,
                isSkipped: e.status === "SKIPPED",
              };
            })}
            expenseEvents={expenseEvents.map((e) => {
              const pool = pools.find((p) => p.id === (e.poolId || e.categoryId));
              return {
                ...e,
                name: e.name || "Scheduled Expense",
                categoryName: pool?.name || "Pool",
                isPrivate: pool?.isPrivate || false,
                isSkipped: e.status === "SKIPPED",
              };
            })}
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
            onMarkExpensePaid={async (eventId) => {
              try {
                await markExpensePaidMut.mutateAsync({ eventId });
                toast.success("Expense marked as spent.");
                utils.listExpenseEvents.invalidate();
                utils.listPools.invalidate();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to mark spent.");
              }
            }}
            onMarkIncomeReceived={async (eventId) => {
              setPaydayActionMode("MARK_RECEIVED");
              setSelectedIncomeEventIdForModal(eventId);
            }}
            onAllocateIncome={async (eventId) => {
              setPaydayActionMode("ALLOCATE");
              setSelectedIncomeEventIdForModal(eventId);
            }}
            onSkipExpense={async (eventId) => {
              try {
                await skipExpenseMut.mutateAsync({ eventId });
                toast.success("Expense skipped.");
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
        <PaydayActionDrawer
          isOpen={Boolean(selectedIncomeEventIdForModal)}
          incomeEventId={selectedIncomeEventIdForModal}
          mode={paydayActionMode}
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
