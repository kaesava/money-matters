"use client";

import React from "react";
import { SourceTable } from "./SourceTable";
import { SourceItem, EventItem } from "./BurstModal";

interface SetupSourcesTabProps {
  incomeItems: SourceItem[];
  expenseItems: SourceItem[];
  searchQuery: string;
  incomeEvents: EventItem[];
  expenseEvents: EventItem[];
  categories: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; name: string }>;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onArchiveIncome: (item: SourceItem) => void;
  onArchiveExpense: (item: SourceItem) => void;
  onEditIncome: (item: SourceItem) => void;
  onEditExpense: (item: SourceItem) => void;
  onMarkPaid: (eventId: string, amount: string, date: string) => void;
  onSkip: (eventId: string) => void;
  onUnskip?: (eventId: string) => void;
  onUpdateEvent: (eventId: string, amount: string, date: string) => void;
  isPendingMarkPaid?: boolean;
  isPendingSkip?: boolean;
}

export function SetupSourcesTab({
  incomeItems,
  expenseItems,
  searchQuery,
  incomeEvents,
  expenseEvents,
  categories,
  bankAccounts,
  onAddIncome,
  onAddExpense,
  onArchiveIncome,
  onArchiveExpense,
  onEditIncome,
  onEditExpense,
  onMarkPaid,
  onSkip,
  onUnskip,
  onUpdateEvent,
  isPendingMarkPaid,
  isPendingSkip,
}: SetupSourcesTabProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-bold text-[#1B2B4B] dark:text-white">
          ⚙️ Recurring Income & Bill Rules
        </h2>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          Configure master recurring income sources and bill schedules that populate your payday waterfall and matrix plan.
        </p>
      </div>

      <SourceTable
        mode="INCOME"
        items={incomeItems}
        bucketHeader="Account"
        searchQuery={searchQuery}
        allIncomeEvents={incomeEvents}
        allExpenseEvents={expenseEvents}
        _categories={categories}
        _bankAccounts={bankAccounts}
        onAdd={onAddIncome}
        onArchive={onArchiveIncome}
        onEdit={onEditIncome}
        onMarkPaid={onMarkPaid}
        onSkip={onSkip}
        onUnskip={onUnskip}
        onUpdateEvent={onUpdateEvent}
        isPendingMarkPaid={isPendingMarkPaid || false}
        isPendingSkip={isPendingSkip || false}
      />

      <SourceTable
        mode="EXPENSE"
        items={expenseItems}
        bucketHeader="Category"
        searchQuery={searchQuery}
        allIncomeEvents={incomeEvents}
        allExpenseEvents={expenseEvents}
        _categories={categories}
        _bankAccounts={bankAccounts}
        onAdd={onAddExpense}
        onArchive={onArchiveExpense}
        onEdit={onEditExpense}
        onMarkPaid={onMarkPaid}
        onSkip={onSkip}
        onUnskip={onUnskip}
        onUpdateEvent={onUpdateEvent}
        isPendingMarkPaid={isPendingMarkPaid || false}
        isPendingSkip={isPendingSkip || false}
      />
    </div>
  );
}
