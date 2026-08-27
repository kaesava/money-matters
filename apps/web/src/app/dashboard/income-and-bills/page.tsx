"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { SourceItem, EventItem } from "./components/BurstModal";
import { UpcomingTimelineTab } from "./components/UpcomingTimelineTab";
import { MatrixPlanTab } from "./components/MatrixPlanTab";
import { SetupSourcesTab } from "./components/SetupSourcesTab";
import { IncomeExpenseFormModal } from "../../../components/web/IncomeExpenseFormModal";
import { InfoTooltip, SearchInput, useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { MatrixIncomeEvent } from "@money-matters/capability-budgeting";

interface CategoryRecord {
  id: string;
  name: string;
  type?: "EVERYDAY" | "REGULAR" | "GOAL";
  isPrivate?: boolean | null;
  isCommitted?: boolean | null;
  isEssential?: boolean | null;
  isSurplusTarget?: boolean | null;
  monthlyAmount?: string | null;
  targetAmount?: string | null;
  everydayAllowanceAmount?: string | null;
  enteredAmount?: string | null;
  currentBalance?: number;
  userId?: string | null;
}

export default function IncomeAndExpensesPage() {
  const toast = useToast();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "SETUP">("SCHEDULE");
  const [scheduleSubView, setScheduleSubView] = useState<"TIMELINE" | "GRID">("TIMELINE");

  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const rawCategories = (categoriesQuery.data ?? []) as unknown as CategoryRecord[];
  const categories = rawCategories;
  const bankAccounts = bankAccountsQuery.data ?? [];
  const incomeEvents = (incomeEventsQuery.data ?? []) as EventItem[];
  const expenseEvents = (expenseEventsQuery.data ?? []) as EventItem[];

  const incomeItems: SourceItem[] = (incomeSourcesQuery.data ?? []).map((inc) => ({
    id: inc.id,
    name: inc.name,
    amount: inc.amount,
    rrule: inc.rrule,
    startDate: inc.startDate,
    receivingAccountId: inc.receivingAccountId,
    accountName: bankAccounts.find((a) => a.id === inc.receivingAccountId)?.name || "Main Account",
  }));

  const expenseItems: SourceItem[] = (expenseSourcesQuery.data ?? []).map((exp) => ({
    id: exp.id,
    name: exp.name,
    amount: exp.amount,
    rrule: exp.rrule,
    startDate: exp.startDate,
    categoryId: exp.categoryId,
    categoryName: categories.find((c) => c.id === exp.categoryId)?.name || "Uncategorized",
  }));

  const matrixIncomeEvents: MatrixIncomeEvent[] = incomeEvents.map((inc) => ({
    id: inc.id,
    sourceName: inc.name || "",
    expectedAmount: parseFloat(inc.expectedAmount || "0"),
    actualAmount: inc.actualAmount ? parseFloat(inc.actualAmount) : null,
    expectedDate: inc.expectedDate,
    rrule: inc.rrule || null,
    status: inc.status as "UPCOMING" | "SKIPPED" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    userId: inc.userId || undefined,
  }));

  const matrixExpenseEvents = expenseEvents.map((e) => ({
    categoryId: e.categoryId || "",
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
  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation({
    onSuccess: () => {
      utils.listExpenseSources.invalidate();
      utils.listExpenseEvents.invalidate();
    },
  });

  const markExpensePaidMut = trpc.markExpensePaid.useMutation({
    onSuccess: () => {
      utils.listExpenseEvents.invalidate();
      utils.listCategories.invalidate();
    },
  });
  const skipExpenseEventMut = trpc.skipExpenseEvent.useMutation({
    onSuccess: () => {
      utils.listExpenseEvents.invalidate();
    },
  });
  const unskipExpenseEventMut = trpc.unskipExpenseEvent.useMutation({
    onSuccess: () => {
      utils.listExpenseEvents.invalidate();
    },
  });
  const updateExpenseEventMut = trpc.updateUpcomingExpense.useMutation({
    onSuccess: () => {
      utils.listExpenseEvents.invalidate();
    },
  });

  const markIncomeReceivedMut = trpc.markIncomeReceived.useMutation({
    onSuccess: () => {
      utils.listIncomeEvents.invalidate();
    },
  });
  const skipIncomeEventMut = trpc.skipIncomeEvent.useMutation({
    onSuccess: () => {
      utils.listIncomeEvents.invalidate();
    },
  });
  const unskipIncomeEventMut = trpc.unskipIncomeEvent.useMutation({
    onSuccess: () => {
      utils.listIncomeEvents.invalidate();
    },
  });
  const updateIncomeEventMut = trpc.updateUpcomingIncome.useMutation({
    onSuccess: () => {
      utils.listIncomeEvents.invalidate();
    },
  });

  const moveMoneyMut = trpc.moveMoney.useMutation({
    onSuccess: () => {
      utils.listCategories.invalidate();
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
        } else {
          await archiveExpenseMut.mutateAsync({ id: item.id });
          posthog.capture("expense_source_archived");
        }
        toast.success(t("toasts.archived"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to archive.");
      }
    },
    [archiveIncomeMut, archiveExpenseMut, toast]
  );

  const handleEdit = useCallback((item: SourceItem, mode: "INCOME" | "EXPENSE") => {
    setModalMode(mode);
    setSourceToEdit({
      id: item.id,
      name: item.name,
      amount: item.amount,
      categoryId: item.categoryId,
      receivingAccountId: item.receivingAccountId,
      rrule: item.rrule,
      startDate: item.startDate,
    });
    setIsModalOpen(true);
  }, []);

  const handleMarkPaid = useCallback(
    (eventId: string, amount: string, date: string) => {
      const cleaned = amount.replace(/[^0-9.]/g, "");
      const val = parseFloat(cleaned);
      const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
      markExpensePaidMut.mutate({ eventId, actualAmount: cleanAmt, recordedAt: date });
    },
    [markExpensePaidMut]
  );

  const handleSkip = useCallback((eventId: string) => {
    skipExpenseEventMut.mutate({ eventId });
  }, [skipExpenseEventMut]);

  const handleUnskip = useCallback((eventId: string) => {
    unskipExpenseEventMut.mutate({ eventId });
  }, [unskipExpenseEventMut]);

  const handleUpdateEvent = useCallback(
    async (eventId: string, amount: string, date: string) => {
      const cleaned = amount.replace(/[^0-9.]/g, "");
      const val = parseFloat(cleaned);
      const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
      await updateExpenseEventMut.mutateAsync({ eventId, expectedAmount: cleanAmt, expectedDate: date });
    },
    [updateExpenseEventMut]
  );

  const handleMarkIncomeReceived = useCallback(
    (eventId: string, amount: string, date: string) => {
      const cleaned = amount.replace(/[^0-9.]/g, "");
      const val = parseFloat(cleaned);
      const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
      markIncomeReceivedMut.mutate({ eventId, actualAmount: cleanAmt, recordedAt: date });
    },
    [markIncomeReceivedMut]
  );

  const handleSkipIncome = useCallback((eventId: string) => {
    skipIncomeEventMut.mutate({ eventId });
  }, [skipIncomeEventMut]);

  const handleUnskipIncome = useCallback((eventId: string) => {
    unskipIncomeEventMut.mutate({ eventId });
  }, [unskipIncomeEventMut]);

  const _handleUpdateIncomeEvent = useCallback(
    async (eventId: string, amount: string, date: string) => {
      const cleaned = amount.replace(/[^0-9.]/g, "");
      const val = parseFloat(cleaned);
      const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
      await updateIncomeEventMut.mutateAsync({ eventId, expectedAmount: cleanAmt, expectedDate: date });
    },
    [updateIncomeEventMut]
  );

  const handleConfirmTransferAndPay = useCallback(
    async (sourceCategoryId: string, destinationCategoryId: string, amount: string) => {
      await moveMoneyMut.mutateAsync({
        sourceCategoryId,
        destinationCategoryId,
        amount,
        note: "Automated shortfall transfer to mark bill paid",
      });
      toast.success(`Transferred $${amount} from source pool.`);
    },
    [moveMoneyMut, toast]
  );

  const currentUserId = categories[0]?.userId || "default-user";

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
            {t("nav.incomeExpenses")}
          </h1>
          <InfoTooltip
            title={t("tooltips.incomeBills.title")}
            content={t("tooltips.incomeBills.content")}
          />
        </div>
        <p className="text-xs text-zinc-500 font-medium mt-1">
          Set up paychecks, plan allocations across a 12-month horizon, and review upcoming bill events.
        </p>
      </div>

      {/* 2-Tab Header Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("SCHEDULE")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === "SCHEDULE"
                ? "bg-[#2563eb] text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            🗓️ Schedule & Allocations
          </button>
          <button
            onClick={() => setActiveTab("SETUP")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === "SETUP"
                ? "bg-[#2563eb] text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            ⚙️ {t("incomeBillsTabs.setupSources")}
          </button>
        </div>

        {activeTab === "SCHEDULE" && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setScheduleSubView("TIMELINE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scheduleSubView === "TIMELINE"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              📅 Timeline View
            </button>
            <button
              onClick={() => setScheduleSubView("GRID")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scheduleSubView === "GRID"
                  ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              📊 12-Month Grid
            </button>
          </div>
        )}

        {activeTab === "SETUP" && (
          <div className="max-w-xs">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search sources..."
            />
          </div>
        )}
      </div>

      {/* Tab Render */}
      {activeTab === "SCHEDULE" && scheduleSubView === "TIMELINE" && (
        <UpcomingTimelineTab
          incomeEvents={incomeEvents}
          expenseEvents={expenseEvents}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            currentBalance: parseFloat(c.enteredAmount || "0"),
            isSurplusTarget: Boolean(c.isSurplusTarget),
          }))}
          searchQuery={searchQuery}
          onMarkExpensePaid={handleMarkPaid}
          onMarkIncomeReceived={handleMarkIncomeReceived}
          onSkipExpense={handleSkip}
          onUnskipExpense={handleUnskip}
          onSkipIncome={handleSkipIncome}
          onUnskipIncome={handleUnskipIncome}
          onConfirmTransferAndPay={handleConfirmTransferAndPay}
        />
      )}

      {activeTab === "SCHEDULE" && scheduleSubView === "GRID" && (
        <MatrixPlanTab
          currentUserId={currentUserId}
          categories={rawCategories.map((c) => ({
            id: c.id,
            name: c.name,
            type: (c.type || "EVERYDAY") as "EVERYDAY" | "REGULAR" | "GOAL",
            isPrivate: Boolean(c.isPrivate),
            isCommitted: Boolean(c.isCommitted),
            isEssential: Boolean(c.isEssential),
            isSurplusTarget: Boolean(c.isSurplusTarget),
            monthlyAmount: c.monthlyAmount ? parseFloat(c.monthlyAmount) : null,
            targetAmount: c.targetAmount ? parseFloat(c.targetAmount) : null,
            everydayAllowanceAmount: c.everydayAllowanceAmount ? parseFloat(c.everydayAllowanceAmount) : null,
            currentBalance: typeof c.currentBalance === "number" ? c.currentBalance : parseFloat(c.enteredAmount || "0"),
            userId: c.userId || undefined,
          }))}
          incomeEvents={matrixIncomeEvents}
          expenseEvents={matrixExpenseEvents}
          onMarkPaid={handleMarkPaid}
        />
      )}

      {activeTab === "SETUP" && (
        <SetupSourcesTab
          incomeItems={incomeItems}
          expenseItems={expenseItems}
          searchQuery={searchQuery}
          incomeEvents={incomeEvents}
          expenseEvents={expenseEvents}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          bankAccounts={bankAccounts.map((a) => ({ id: a.id, name: a.name }))}
          onAddIncome={() => {
            setModalMode("INCOME");
            setSourceToEdit(null);
            setIsModalOpen(true);
          }}
          onAddExpense={() => {
            setModalMode("EXPENSE");
            setSourceToEdit(null);
            setIsModalOpen(true);
          }}
          onArchiveIncome={(item) => handleArchive(item, "INCOME")}
          onArchiveExpense={(item) => handleArchive(item, "EXPENSE")}
          onEditIncome={(item) => handleEdit(item, "INCOME")}
          onEditExpense={(item) => handleEdit(item, "EXPENSE")}
          onMarkPaid={handleMarkPaid}
          onSkip={handleSkip}
          onUnskip={handleUnskip}
          onUpdateEvent={handleUpdateEvent}
          isPendingMarkPaid={markExpensePaidMut.isPending}
          isPendingSkip={skipExpenseEventMut.isPending}
        />
      )}

      <IncomeExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        sourceToEdit={sourceToEdit}
        onArchive={(item) => handleArchive(item, modalMode)}
        onSuccess={() => {
          utils.listIncomeSources.invalidate();
          utils.listExpenseSources.invalidate();
          utils.listIncomeEvents.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />
    </div>
  );
}
