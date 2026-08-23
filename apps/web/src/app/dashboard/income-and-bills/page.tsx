"use client";

import React, { useState, useCallback } from "react";
import { trpc } from "../../../lib/trpc";
import posthog from "../../../lib/posthog-client";
import { SourceTable } from "./components/SourceTable";
import { SourceItem, EventItem } from "./components/BurstModal";
import { IncomeExpenseFormModal } from "../../../components/web/IncomeExpenseFormModal";
import { InfoTooltip, SearchInput } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";



export default function IncomeAndExpensesPage() {
  const utils = trpc.useUtils();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const incomeEvents = (incomeEventsQuery.data ?? []) as EventItem[];
  const expenseEvents = (expenseEventsQuery.data ?? []) as EventItem[];

  const incomeItems: SourceItem[] = (incomeSourcesQuery.data ?? []).map((inc) => ({
    id: inc.id, name: inc.name, amount: inc.amount, rrule: inc.rrule, startDate: inc.startDate,
    receivingAccountId: inc.receivingAccountId,
    accountName: bankAccounts.find((a) => a.id === inc.receivingAccountId)?.name || "Main Account",
  }));

  const expenseItems: SourceItem[] = (expenseSourcesQuery.data ?? []).map((exp) => ({
    id: exp.id, name: exp.name, amount: exp.amount, rrule: exp.rrule, startDate: exp.startDate,
    categoryId: exp.categoryId,
    categoryName: categories.find((c) => c.id === exp.categoryId)?.name || "Uncategorized",
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({ onSuccess: () => { utils.listIncomeSources.invalidate(); utils.listIncomeEvents.invalidate(); } });
  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation({ onSuccess: () => { utils.listExpenseSources.invalidate(); utils.listExpenseEvents.invalidate(); } });
  
  const markExpensePaidMut = trpc.markExpensePaid.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); utils.listCategories.invalidate(); } });
  const skipExpenseEventMut = trpc.skipExpenseEvent.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });
  const unskipExpenseEventMut = trpc.unskipExpenseEvent.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });
  const updateExpenseEventMut = trpc.updateUpcomingExpense.useMutation({ onSuccess: () => { utils.listExpenseEvents.invalidate(); } });

  const markIncomeReceivedMut = trpc.markIncomeReceived.useMutation({ onSuccess: () => { utils.listIncomeEvents.invalidate(); } });
  const skipIncomeEventMut = trpc.skipIncomeEvent.useMutation({ onSuccess: () => { utils.listIncomeEvents.invalidate(); } });
  const unskipIncomeEventMut = trpc.unskipIncomeEvent.useMutation({ onSuccess: () => { utils.listIncomeEvents.invalidate(); } });
  const updateIncomeEventMut = trpc.updateUpcomingIncome.useMutation({ onSuccess: () => { utils.listIncomeEvents.invalidate(); } });

  const handleArchive = useCallback(async (item: { id: string; name?: string }, mode: "INCOME" | "EXPENSE") => {
    const label = mode === "INCOME" ? "income stream" : "bill";
    if (!confirm(`Archiving this ${label} will cancel all future upcoming events. Continue?`)) return;
    try {
      if (mode === "INCOME") { await archiveIncomeMut.mutateAsync({ id: item.id }); posthog.capture("income_source_archived"); }
      else { await archiveExpenseMut.mutateAsync({ id: item.id }); posthog.capture("expense_source_archived"); }
    } catch (err) { alert(err instanceof Error ? err.message : "Failed to archive."); }
  }, [archiveIncomeMut, archiveExpenseMut]);

  const handleEdit = useCallback((item: SourceItem, mode: "INCOME" | "EXPENSE") => {
    setModalMode(mode);
    setSourceToEdit({ id: item.id, name: item.name, amount: item.amount, categoryId: item.categoryId, receivingAccountId: item.receivingAccountId, rrule: item.rrule, startDate: item.startDate });
    setIsModalOpen(true);
  }, []);

  const handleMarkPaid = useCallback((eventId: string, amount: string, date: string) => {
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
    markExpensePaidMut.mutate({ eventId, actualAmount: cleanAmt, recordedAt: date });
  }, [markExpensePaidMut]);

  const handleSkip = useCallback((eventId: string) => { skipExpenseEventMut.mutate({ eventId }); }, [skipExpenseEventMut]);
  const handleUnskip = useCallback((eventId: string) => { unskipExpenseEventMut.mutate({ eventId }); }, [unskipExpenseEventMut]);

  const handleUpdateEvent = useCallback(async (eventId: string, amount: string, date: string) => {
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
    await updateExpenseEventMut.mutateAsync({ eventId, expectedAmount: cleanAmt, expectedDate: date });
  }, [updateExpenseEventMut]);

  const handleMarkIncomeReceived = useCallback((eventId: string, amount: string, date: string) => {
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
    markIncomeReceivedMut.mutate({ eventId, actualAmount: cleanAmt, recordedAt: date });
  }, [markIncomeReceivedMut]);

  const handleSkipIncome = useCallback((eventId: string) => { skipIncomeEventMut.mutate({ eventId }); }, [skipIncomeEventMut]);
  const handleUnskipIncome = useCallback((eventId: string) => { unskipIncomeEventMut.mutate({ eventId }); }, [unskipIncomeEventMut]);

  const handleUpdateIncomeEvent = useCallback(async (eventId: string, amount: string, date: string) => {
    const cleaned = amount.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    const cleanAmt = isNaN(val) ? "0.00" : val.toFixed(2);
    await updateIncomeEventMut.mutateAsync({ eventId, expectedAmount: cleanAmt, expectedDate: date });
  }, [updateIncomeEventMut]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("nav.incomeExpenses")}</h1>
          <InfoTooltip
            title={t("tooltips.incomeBills.title")}
            content={t("tooltips.incomeBills.content")}
          />
        </div>
        <p className="text-xs text-zinc-500 font-medium mt-1">
          Set up upcoming paychecks and recurring bills to automate your payday waterfall.
        </p>
      </div>

      <div className="max-w-md">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search name, category, or account..."
        />
      </div>

      <SourceTable
        mode="INCOME" items={incomeItems} bucketHeader="Account" searchQuery={searchQuery}
        allIncomeEvents={incomeEvents} allExpenseEvents={expenseEvents}
        _categories={categories} _bankAccounts={bankAccounts}
        onAdd={() => { setModalMode("INCOME"); setSourceToEdit(null); setIsModalOpen(true); }}
        onArchive={(item) => handleArchive(item, "INCOME")}
        onEdit={(item) => handleEdit(item, "INCOME")}
        onMarkPaid={handleMarkIncomeReceived}
        onSkip={handleSkipIncome}
        onUnskip={handleUnskipIncome}
        onUpdateEvent={handleUpdateIncomeEvent}
        isPendingMarkPaid={markIncomeReceivedMut.isPending}
        isPendingSkip={skipIncomeEventMut.isPending}
      />

      <SourceTable
        mode="EXPENSE" items={expenseItems} bucketHeader="Category" searchQuery={searchQuery}
        allIncomeEvents={incomeEvents} allExpenseEvents={expenseEvents}
        _categories={categories} _bankAccounts={bankAccounts}
        onAdd={() => { setModalMode("EXPENSE"); setSourceToEdit(null); setIsModalOpen(true); }}
        onArchive={(item) => handleArchive(item, "EXPENSE")}
        onEdit={(item) => handleEdit(item, "EXPENSE")}
        onMarkPaid={handleMarkPaid}
        onSkip={handleSkip}
        onUnskip={handleUnskip}
        onUpdateEvent={handleUpdateEvent}
        isPendingMarkPaid={markExpensePaidMut.isPending}
        isPendingSkip={skipExpenseEventMut.isPending}
      />

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
