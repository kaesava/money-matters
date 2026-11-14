"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { Spinner, SearchInput, Tabs, InfoTooltip, useToast } from "@money-matters/ui/web";
import { MoreVertical, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft } from "lucide-react";
import { IncomeFormModal, IncomeSourceToEdit } from "../../../components/web/IncomeFormModal";
import { QuickExpenseDrawer } from "../../../components/web/QuickExpenseDrawer";
import { EnvelopeFormModal } from "../../../components/web/EnvelopeFormModal";
import { IncomeSchedulesCard } from "./components/IncomeSchedulesCard";
import { BillSchedulesCard } from "./components/BillSchedulesCard";
import { TimelineTabWrapper } from "./components/TimelineTabWrapper";
import { MatrixPlanTab } from "./components/MatrixPlanTab";
import { MarkPaidModal } from "./components/MarkPaidModal";

const VALID_TABS = ["EVENTS", "MATRIX", "STREAMS"] as const;
type PlanTab = typeof VALID_TABS[number];

function IncomeAndBillsContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const normalizedTab = rawTab ? (rawTab.toUpperCase() as PlanTab) : "EVENTS";
  const initialTab = VALID_TABS.includes(normalizedTab) ? normalizedTab : "EVENTS";

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PlanTab>(initialTab);
  const [quickActionTab, setQuickActionTab] = useState<"DEBIT" | "CREDIT" | "TRANSFER" | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<IncomeSourceToEdit | undefined>(undefined);
  const [isEnvelopeModalOpen, setIsEnvelopeModalOpen] = useState(false);
  const [envelopeToEdit, setEnvelopeToEdit] = useState<{
    id: string;
    name: string;
    bankAccountId?: string | null;
    monthlyAmount?: string | null;
    enteredAmount?: string | null;
    budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY" | null;
    startDate?: string | null;
    endDate?: string | null;
    rrule?: string | null;
    envelopeType?: string;
    poolType?: string;
    type?: string;
    fundingMode?: "RECURRING" | "TARGET_BALANCE";
    isPriority?: boolean;
    hasScheduledEvents?: boolean | null;
  } | null>(null);

  const [setupSearchQuery, setSetupSearchQuery] = useState("");
  const toast = useToast();
  const markExpensePaidMut = trpc.markExpensePaid.useMutation();
  const [matrixMarkPaidTarget, setMatrixMarkPaidTarget] = useState<{
    eventId: string;
    name: string;
    amount: string;
    date: string;
    poolId?: string;
  } | null>(null);
  const [setupScopeFilter, setSetupScopeFilter] = useState<"ALL" | "SHARED" | "PRIVATE">("ALL");
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOverflowMenuOpen(false);
      }
    }
    if (overflowMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [overflowMenuOpen]);

  const editIncomeId = searchParams.get("editIncomeId");
  const editBillId = searchParams.get("editBillId");

  React.useEffect(() => {
    if (rawTab) {
      const upper = rawTab.toUpperCase() as PlanTab;
      if (VALID_TABS.includes(upper) && upper !== activeTab) {
        setActiveTab(upper);
      }
    }
  }, [rawTab, activeTab]);

  const handleTabChange = (tabId: string) => {
    const valid = VALID_TABS.includes(tabId as PlanTab) ? (tabId as PlanTab) : "EVENTS";
    setActiveTab(valid);
    router.push(`/dashboard/income-and-bills?tab=${valid.toLowerCase()}`, { scroll: false });
  };

  const utils = trpc.useUtils();
  const poolsQuery = trpc.listEnvelopes.useQuery();
  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const billSchedulesQuery = trpc.listBillSchedules.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();
  const transferEventsQuery = trpc.listTransferEvents.useQuery();
  const allPlansQuery = trpc.listAllAllocationPlans.useQuery();

  const isLoading =
    poolsQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    incomeSourcesQuery.isLoading ||
    billSchedulesQuery.isLoading ||
    incomeEventsQuery.isLoading ||
    expenseEventsQuery.isLoading ||
    transferEventsQuery.isLoading;

  const pools = useMemo(() => poolsQuery.data || [], [poolsQuery.data]);
  const bankAccounts = useMemo(() => bankAccountsQuery.data || [], [bankAccountsQuery.data]);
  const incomeSources = useMemo(() => incomeSourcesQuery.data || [], [incomeSourcesQuery.data]);
  const billSchedules = useMemo(() => billSchedulesQuery.data || [], [billSchedulesQuery.data]);
  const incomeEvents = useMemo(() => incomeEventsQuery.data || [], [incomeEventsQuery.data]);
  const expenseEvents = useMemo(() => expenseEventsQuery.data || [], [expenseEventsQuery.data]);
  const transferEvents = useMemo(() => transferEventsQuery.data || [], [transferEventsQuery.data]);

  useEffect(() => {
    if (editIncomeId && incomeSources.length > 0) {
      const src = incomeSources.find((s) => s.id === editIncomeId);
      if (src) {
        setIncomeToEdit({
          ...src,
          receivingAccountId: src.receivingAccountId || undefined,
        });
        setIsIncomeModalOpen(true);
      }
    }
  }, [editIncomeId, incomeSources]);

  useEffect(() => {
    if (editBillId && (billSchedules.length > 0 || pools.length > 0)) {
      const cat = billSchedules.find((b) => b.id === editBillId || b.envelopeId === editBillId);
      const targetPool = pools.find((p) => p.id === editBillId || (cat && p.id === cat.envelopeId));
      if (cat || targetPool) {
        const resolvedEnvelopeType = targetPool?.envelopeType || "BILL";
        setEnvelopeToEdit({
          id: targetPool?.id || cat?.envelopeId || cat?.id || editBillId,
          name: targetPool?.name || cat?.envelopeName || cat?.name || "",
          bankAccountId: targetPool?.bankAccountId,
          monthlyAmount: targetPool?.monthlyAmount || cat?.amount,
          enteredAmount: targetPool?.enteredAmount || cat?.amount,
          budgetFrequency: (cat?.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || targetPool?.budgetFrequency || "MONTHLY",
          startDate: cat?.startDate || targetPool?.startDate,
          endDate: cat?.endDate || targetPool?.endDate,
          rrule: cat?.rrule || targetPool?.rrule,
          envelopeType: resolvedEnvelopeType,
          fundingMode: targetPool?.fundingMode || "RECURRING",
          isPriority: targetPool?.isPriority ?? cat?.isPriority ?? false,
          hasScheduledEvents: cat?.hasScheduledEvents ?? targetPool?.hasScheduledEvents,
        });
        setIsEnvelopeModalOpen(true);
      }
    }
  }, [editBillId, billSchedules, pools]);

  const savedIncomeEventIds = useMemo(() => {
    const set = new Set<string>();
    if (allPlansQuery.data) {
      for (const plan of allPlansQuery.data) {
        if (plan.status !== "CONFIRMED") set.add(plan.incomeEventId);
      }
    }
    return set;
  }, [allPlansQuery.data]);

  const matrixIncomeEvents = useMemo(() => {
    return incomeEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => {
        const receivingAccountId = (e as unknown as { receivingAccountId?: string }).receivingAccountId;
        const acct = bankAccounts.find((b) => b.id === receivingAccountId);
        return {
          id: e.id,
          expectedDate: e.expectedDate,
          expectedAmount: parseFloat(e.expectedAmount || "0"),
          actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
          status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
          sourceName: (e as unknown as { name?: string; sourceName?: string }).name || e.sourceName || "Paycheck",
          isPrivate: acct?.isPrivate || false,
        };
      });
  }, [incomeEvents, bankAccounts]);

  const matrixExpenseEvents = useMemo(() => {
    return expenseEvents
      .filter((e) => e && Boolean(e.expectedDate) && String(e.expectedDate).length >= 10)
      .map((e) => ({
        categoryId: e.envelopeId || "",
        amount: parseFloat(e.expectedAmount || "0"),
        dueDate: e.expectedDate,
        status: (e.status as "PENDING" | "CONFIRMED") || "PENDING",
      }));
  }, [expenseEvents]);

  const matrixCategories = useMemo(() => {
    return pools.map((p) => {
      const isGoal = p.envelopeType === "GOAL";
      const isEveryday = p.envelopeType === "EVERYDAY";
      const typeStr = isEveryday ? "EVERYDAY" : isGoal ? "GOAL" : "BILL";
      const monthlyAmt = p.monthlyAmount ? parseFloat(p.monthlyAmount) : p.targetAmount ? parseFloat(p.targetAmount) : null;

      return {
        id: p.id,
        name: p.name,
        type: typeStr as "BILL" | "GOAL" | "EVERYDAY",
        currentBalance: parseFloat(String(p.currentBalance || "0")),
        monthlyAmount: monthlyAmt,
        targetAmount: p.targetAmount ? parseFloat(p.targetAmount) : null,
        isPriority: p.isPriority ?? undefined,
        isSurplusTarget: p.isSurplusTarget ?? undefined,
        isPrivate: p.isPrivate ?? undefined,
        endDate: p.endDate || null,
      };
    });
  }, [pools]);

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B] dark:text-white tracking-tight">{t("incomeBillsTabs.incomeSchedulesAndBillsTitle")}</h1>
          <InfoTooltip content={t("incomeBillsTabs.incomeSchedulesAndBillsSubtitle")} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
              className="p-2.5 rounded-xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all border border-zinc-200 dark:border-zinc-700 flex items-center justify-center cursor-pointer shadow-2xs"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {overflowMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setOverflowMenuOpen(false);
                    setQuickActionTab("DEBIT");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                  <span>{t("categories.actions.quickExpense")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOverflowMenuOpen(false);
                    setQuickActionTab("CREDIT");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4 text-[#2563eb]" />
                  <span>{t("categories.actions.quickIncome")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOverflowMenuOpen(false);
                    setQuickActionTab("TRANSFER");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4 text-[#2563eb]" />
                  <span>{t("categories.actions.moveMoney")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "EVENTS", label: t("transactions.tabs.pendingList") },
          { id: "MATRIX", label: t("incomeBillsTabs.twelveMonthTab") },
          { id: "STREAMS", label: t("incomeBillsTabs.schedules") },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === "STREAMS" && (
        <div data-tour="schedules-tab" className="space-y-6">
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
              onAddOneOff={() => setQuickActionTab("CREDIT")}
              onEdit={(src) => { setIncomeToEdit(src); setIsIncomeModalOpen(true); }}
            />
            <BillSchedulesCard
              billSchedules={billSchedules.map((b) => ({
                ...b,
                poolId: b.envelopeId,
                poolName: b.envelopeName,
                envelopeType: b.envelopeType,
                budgetFrequency: b.budgetFrequency,
                isPriority: b.isPriority,
              }))}
              searchQuery={setupSearchQuery}
              scopeFilter={setupScopeFilter}
              onAddBillSchedule={() => { setEnvelopeToEdit(null); setIsEnvelopeModalOpen(true); }}
              onAddOneOff={() => setQuickActionTab("DEBIT")}
              onEditCategory={(cat) => {
                const targetPool = pools.find((p) => p.id === cat.id || p.id === cat.poolId);
                const resolvedEnvelopeType = targetPool?.envelopeType || "BILL";
                setEnvelopeToEdit({
                  id: cat.id,
                  name: cat.name,
                  bankAccountId: targetPool?.bankAccountId,
                  monthlyAmount: cat.monthlyAmount,
                  enteredAmount: cat.enteredAmount,
                  budgetFrequency: (cat.budgetFrequency as "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY") || targetPool?.budgetFrequency || "MONTHLY",
                  startDate: cat.startDate || targetPool?.startDate,
                  endDate: cat.endDate || targetPool?.endDate,
                  rrule: cat.rrule || targetPool?.rrule,
                  envelopeType: resolvedEnvelopeType,
                  fundingMode: targetPool?.fundingMode || "RECURRING",
                  isPriority: targetPool?.isPriority ?? false,
                  hasScheduledEvents: (cat as unknown as { hasScheduledEvents?: boolean }).hasScheduledEvents ?? targetPool?.hasScheduledEvents,
                });
                setIsEnvelopeModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "EVENTS" && (
        <div data-tour="upcoming-events">
          <TimelineTabWrapper
            isLoading={isLoading}
            savedIncomeEventIds={savedIncomeEventIds}
            incomeEvents={incomeEvents.map((e) => {
              const src = incomeSources.find((s) => s.id === e.incomeSourceId);
              const receivingAccountId = src?.receivingAccountId || (e as unknown as { receivingAccountId?: string; bankAccountId?: string }).receivingAccountId || (e as unknown as { bankAccountId?: string }).bankAccountId;
              const acct = bankAccounts.find((b) => b.id === receivingAccountId);
              const resolvedAccountName = acct?.name || (e as unknown as { bankAccountName?: string }).bankAccountName;
              return {
                ...e,
                incomeSourceId: e.incomeSourceId,
                accountId: acct?.id || receivingAccountId,
                name: (e as unknown as { name?: string }).name || e.sourceName || "Income Deposit",
                accountName: resolvedAccountName || "Bank Account",
                isPrivate: acct?.isPrivate || false,
              };
            })}
            expenseEvents={expenseEvents.map((e) => {
              const pool = pools.find((p) => p.id === e.envelopeId);
              const acct = bankAccounts.find((b) => b.id === pool?.bankAccountId);
              return {
                ...e,
                poolId: pool?.id || e.envelopeId,
                accountId: acct?.id,
                accountName: acct?.name,
                name: e.name || "Scheduled Expense",
                categoryName: pool?.name || "Envelope",
                isPrivate: pool?.isPrivate || false,
              };
            })}
            transferEvents={transferEvents.map((e) => ({ ...e, name: e.name || "Envelope Transfer" }))}
            categories={pools.map((p) => ({ id: p.id, name: p.name, poolType: p.envelopeType, currentBalance: parseFloat(String(p.currentBalance || "0")), isSurplusTarget: p.isSurplusTarget }))}
            pools={pools.map((p) => ({ id: p.id, name: p.name, poolType: p.envelopeType, currentBalance: parseFloat(String(p.currentBalance || "0")), isSurplusTarget: p.isSurplusTarget, bankAccountId: p.bankAccountId }))}
            onOpenTransferDrawer={() => setQuickActionTab("TRANSFER")}
          />
        </div>
      )}

      {activeTab === "MATRIX" && (
        <MatrixPlanTab
          currentUserId={pools[0]?.userId || "default-user"}
          categories={matrixCategories}
          incomeEvents={matrixIncomeEvents}
          expenseEvents={matrixExpenseEvents}
          onMarkPaid={(eventId, amount, date) => {
            const evt = expenseEvents.find((e) => e.id === eventId);
            setMatrixMarkPaidTarget({
              eventId,
              name: evt?.name || "Expense",
              amount,
              date,
              poolId: evt?.envelopeId ?? undefined,
            });
          }}
        />
      )}

      {matrixMarkPaidTarget && (
        <MarkPaidModal
          isOpen={Boolean(matrixMarkPaidTarget)}
          onClose={() => setMatrixMarkPaidTarget(null)}
          billName={matrixMarkPaidTarget.name}
          poolId={matrixMarkPaidTarget.poolId}
          initialAmount={matrixMarkPaidTarget.amount}
          initialDate={matrixMarkPaidTarget.date}
          availableCategories={pools.map((p) => ({
            id: p.id,
            name: p.name,
            poolType: p.envelopeType,
            currentBalance: parseFloat(String(p.currentBalance || "0")),
            isSurplusTarget: p.isSurplusTarget,
          }))}
          onConfirmMarkPaid={async ({ amount, date, transfers }) => {
            const shortfallTransfers = (transfers || [])
              .filter((tr) => parseFloat(tr.amount || "0") > 0)
              .map((tr) => ({ sourceEnvelopeId: tr.poolId, amount: parseFloat(tr.amount).toFixed(2) }));
            await markExpensePaidMut.mutateAsync({
              eventId: matrixMarkPaidTarget.eventId,
              amount: amount.toFixed(2),
              date,
              note: `Paid on ${date}`,
              shortfallTransfers: shortfallTransfers.length > 0 ? shortfallTransfers : undefined,
            });
            toast.success(t("toasts.expenseMarkedPaid"));
            await Promise.all([
              utils.listExpenseEvents.invalidate(),
              utils.listEnvelopes.invalidate(),
              utils.listTransactions.invalidate(),
            ]);
            setMatrixMarkPaidTarget(null);
          }}
        />
      )}

      {isIncomeModalOpen && (
        <IncomeFormModal
          isOpen={isIncomeModalOpen}
          onClose={() => { setIsIncomeModalOpen(false); setIncomeToEdit(undefined); }}
          sourceToEdit={incomeToEdit}
        />
      )}

      {isEnvelopeModalOpen && (
        <EnvelopeFormModal
          isOpen={isEnvelopeModalOpen}
          initialMode="BILL_SCHEDULE"
          onClose={() => { setIsEnvelopeModalOpen(false); setEnvelopeToEdit(null); }}
          envelopeToEdit={envelopeToEdit}
          onSuccess={() => {
            utils.listBillSchedules.invalidate();
            utils.listEnvelopes.invalidate();
            utils.listExpenseEvents.invalidate();
          }}
        />
      )}

      {quickActionTab && (
        <QuickExpenseDrawer
          initialTab={quickActionTab}
          onClose={() => setQuickActionTab(null)}
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
