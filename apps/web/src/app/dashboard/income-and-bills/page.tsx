"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { Spinner, SearchInput, Tabs } from "@money-matters/ui/web";
import { IncomeFormModal, IncomeSourceToEdit } from "../../../components/web/IncomeFormModal";
import { OneOffExpenseModal } from "./components/OneOffExpenseModal";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";
import { IncomeSchedulesCard } from "./components/IncomeSchedulesCard";
import { BillSchedulesCard } from "./components/BillSchedulesCard";
import { TimelineTabWrapper } from "./components/TimelineTabWrapper";

function IncomeAndBillsContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tabParam = rawTab === "MATRIX" ? "EVENTS" : (rawTab || "EVENTS");

  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tabParam);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<IncomeSourceToEdit | undefined>(undefined);
  const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);

  const [setupSearchQuery, setSetupSearchQuery] = useState("");
  const [setupScopeFilter, setSetupScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");

  React.useEffect(() => {
    if (rawTab === "MATRIX") {
      router.replace("/dashboard/income-split");
      return;
    }
    if (tabParam) setActiveTab(tabParam);
  }, [rawTab, tabParam, router]);

  const poolsQuery = trpc.listPools.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const billSchedulesQuery = trpc.listBillSchedules.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    categoriesQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    billSchedulesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading ||
    transferEventsQuery.isLoading;

  const pools = useMemo(() => poolsQuery.data || [], [poolsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const bankAccounts = useMemo(() => bankAccountsQuery.data || [], [bankAccountsQuery.data]);
  const incomeSources = useMemo(() => incomeSourcesQuery.data || [], [incomeSourcesQuery.data]);
  const billSchedules = useMemo(() => billSchedulesQuery.data || [], [billSchedulesQuery.data]);
  const incomeEvents = useMemo(() => incomeEventsQuery.data || [], [incomeEventsQuery.data]);
  const expenseEvents = useMemo(() => expenseEventsQuery.data || [], [expenseEventsQuery.data]);
  const transferEvents = useMemo(() => transferEventsQuery.data || [], [transferEventsQuery.data]);

  const savedIncomeEventIds = useMemo(() => {
    const set = new Set<string>();
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.status !== "CONFIRMED") set.add(plan.incomeEventId);
      }
    }
    return set;
  }, [allPlansQuery.data]);

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] dark:text-white tracking-tight">Income Schedules &amp; Bills</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Manage scheduled income and track upcoming bill events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/income-split"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-2 shadow-2xs"
          >
            <span>📅</span>
            <span>{t("incomeBillsTabs.twelveMonthIncomeSplit")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsTransferDrawerOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <span>🔄</span>
            <span>{t("dashboard.transferBetweenPools")}</span>
          </button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "EVENTS", label: t("transactions.tabs.pendingList") },
          { id: "STREAMS", label: "Income Schedules" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "STREAMS" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <div className="flex-1 w-full max-w-full">
              <SearchInput value={setupSearchQuery} onChange={setSetupSearchQuery} placeholder="Search income or bill schedules..." />
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              {(["ALL", "SHARED", "PRIVATE"] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setSetupScopeFilter(sc)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    setupScopeFilter === sc
                      ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {sc === "ALL" ? "All" : sc === "SHARED" ? "Shared" : "Private"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncomeSchedulesCard
              incomeSources={incomeSources}
              bankAccounts={bankAccounts}
              searchQuery={setupSearchQuery}
              scopeFilter={setupScopeFilter}
              onAdd={() => { setIncomeToEdit(undefined); setIsIncomeModalOpen(true); }}
              onEdit={(src) => { setIncomeToEdit(src); setIsIncomeModalOpen(true); }}
            />
            <BillSchedulesCard
              billSchedules={billSchedules}
              searchQuery={setupSearchQuery}
              scopeFilter={setupScopeFilter}
              onAddOneOff={() => setIsOneOffModalOpen(true)}
              onViewSchedule={({ poolId }) => router.push(`/dashboard/pools?poolId=${poolId}`)}
            />
          </div>
        </div>
      )}

      {activeTab === "EVENTS" && (
        <div data-tour="matrix-plan">
          <TimelineTabWrapper
          isLoading={isLoading}
          savedIncomeEventIds={savedIncomeEventIds}
          incomeEvents={incomeEvents.map((e) => {
            const src = incomeSources.find((s) => s.id === e.incomeSourceId);
            const acct = bankAccounts.find((b) => b.id === src?.receivingAccountId);
            return {
              ...e,
              accountId: acct?.id,
              name: (e as unknown as { name?: string }).name || e.sourceName || "Income Deposit",
              accountName: acct?.name || "Bank Account",
              isPrivate: acct?.isPrivate || false,
            };
          })}
          expenseEvents={expenseEvents.map((e) => {
            const pool = pools.find((p) => p.id === (e.poolId || e.categoryId));
            const acct = bankAccounts.find((b) => b.id === pool?.bankAccountId);
            return {
              ...e,
              poolId: pool?.id || e.poolId || e.categoryId,
              accountId: acct?.id,
              accountName: acct?.name,
              name: e.name || "Scheduled Expense",
              categoryName: pool?.name || "Pool",
              isPrivate: pool?.isPrivate || false,
            };
          })}
          transferEvents={transferEvents.map((e) => ({ ...e, name: e.name || "Pool Transfer" }))}
          categories={pools.map((p) => ({ id: p.id, name: p.name, poolType: p.poolType, currentBalance: parseFloat(String(p.currentBalance || "0")), isSurplusTarget: p.isSurplusTarget }))}
          pools={pools.map((p) => ({ id: p.id, name: p.name, poolType: p.poolType, currentBalance: parseFloat(String(p.currentBalance || "0")), isSurplusTarget: p.isSurplusTarget, bankAccountId: p.bankAccountId }))}
          onOpenTransferDrawer={() => setIsTransferDrawerOpen(true)}
        />
        </div>
      )}

      {isIncomeModalOpen && (
        <IncomeFormModal
          isOpen={isIncomeModalOpen}
          onClose={() => { setIsIncomeModalOpen(false); setIncomeToEdit(undefined); }}
          sourceToEdit={incomeToEdit}
        />
      )}

      {isOneOffModalOpen && (
        <OneOffExpenseModal
          isOpen={isOneOffModalOpen}
          onClose={() => setIsOneOffModalOpen(false)}
          pools={pools}
          categories={categories}
        />
      )}

      {isTransferDrawerOpen && (
        <QuickExpenseDrawer initialTab="TRANSFER" onClose={() => setIsTransferDrawerOpen(false)} />
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
