"use client";
import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { FilterBar } from "../../../components/web/FilterBar";
import { IncomeExpenseFormModal } from "../../../components/web/IncomeExpenseFormModal";
import { SourceBurstDetailModal } from "../../../components/web/SourceBurstDetailModal";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IncomeAndExpensesPage() {
  const utils = trpc.useUtils();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  // Burst Detail Hyperlink Modal State
  const [burstModalOpen, setBurstModalOpen] = useState(false);
  const [burstModalMode, setBurstModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [burstSourceId, setBurstSourceId] = useState<string | null>(null);
  const [burstSourceName, setBurstSourceName] = useState("");
  const [burstSourceAmount, setBurstSourceAmount] = useState("");
  const [burstCategoryName, setBurstCategoryName] = useState("");

  // Mutations
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

  type IncomeItem = typeof incomeSources[number];
  type ExpenseItem = typeof expenseSources[number];

  const handleArchiveIncome = async (inc: IncomeItem) => {
    if (confirm(`Are you sure you want to archive income source "${inc.name}"?`)) {
      try {
        await archiveIncomeMut.mutateAsync({ id: inc.id });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to archive income source.";
        alert(message);
      }
    }
  };

  const handleArchiveExpense = async (exp: ExpenseItem) => {
    if (confirm(`Are you sure you want to archive expense source "${exp.name}"?`)) {
      try {
        await archiveExpenseMut.mutateAsync({ id: exp.id });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to archive expense source.";
        alert(message);
      }
    }
  };

  // Filter Logic
  const filteredIncome = incomeSources.filter((i) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !i.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const filteredExpense = expenseSources.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !e.name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Income & Expenses</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Configure recurring paychecks, bonuses, utility bills, and fixed obligations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setModalMode("INCOME");
              setSourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>💰</span>
            <span>Add Income Source</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode("EXPENSE");
              setSourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
          >
            <span>💸</span>
            <span>Add Expense Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search income deposit or bill name..."
        onClearAll={() => setSearchQuery("")}
      />

      {/* Split Side-by-Side Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Sources Table */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-emerald-50/50 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💵</span>
              <h3 className="text-sm font-black text-[#1B2B4B]">Income Sources ({filteredIncome.length})</h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              Inflows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Deposit Name</th>
                  <th className="px-5 py-3.5">Expected Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredIncome.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-zinc-400 font-medium">
                      No income sources configured.
                    </td>
                  </tr>
                ) : (
                  filteredIncome.map((inc) => (
                    <tr key={inc.id} className="hover:bg-zinc-50/50 transition-colors font-semibold">
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBurstModalMode("INCOME");
                            setBurstSourceId(inc.id);
                            setBurstSourceName(inc.name);
                            setBurstSourceAmount(inc.amount);
                            setBurstCategoryName("");
                            setBurstModalOpen(true);
                          }}
                          className="text-[#00B4A6] hover:underline font-bold text-left cursor-pointer"
                        >
                          {inc.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-extrabold text-emerald-600">
                        {fmt(inc.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setModalMode("INCOME");
                              setSourceToEdit(inc);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveIncome(inc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Sources Table */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-teal-50/50 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <h3 className="text-sm font-black text-[#1B2B4B]">Expense Bills ({filteredExpense.length})</h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-[#00B4A6] bg-teal-100 px-2 py-0.5 rounded-full">
              Mandatory Category Outflows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Bill Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredExpense.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-zinc-400 font-medium">
                      No expense bills configured.
                    </td>
                  </tr>
                ) : (
                  filteredExpense.map((exp) => {
                    const cat = categories.find((c) => c.id === exp.categoryId);
                    return (
                      <tr key={exp.id} className="hover:bg-zinc-50/50 transition-colors font-semibold">
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setBurstModalMode("EXPENSE");
                              setBurstSourceId(exp.id);
                              setBurstSourceName(exp.name);
                              setBurstSourceAmount(exp.amount);
                              setBurstCategoryName(cat?.name || "Category");
                              setBurstModalOpen(true);
                            }}
                            className="text-[#00B4A6] hover:underline font-bold text-left cursor-pointer"
                          >
                            {exp.name}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700">
                            {cat?.name || "Unassigned"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-extrabold text-[#1B2B4B]">
                          {fmt(exp.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setModalMode("EXPENSE");
                                setSourceToEdit(exp);
                                setIsModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveExpense(exp)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                            >
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Shared Add/Edit Income and Expense Modal */}
      <IncomeExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        sourceToEdit={sourceToEdit}
        onSuccess={() => {
          utils.listIncomeSources.invalidate();
          utils.listExpenseSources.invalidate();
          utils.listIncomeEvents.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />

      {/* Burst Detail Hyperlink Modal */}
      <SourceBurstDetailModal
        isOpen={burstModalOpen}
        onClose={() => setBurstModalOpen(false)}
        mode={burstModalMode}
        sourceId={burstSourceId}
        sourceName={burstSourceName}
        sourceAmount={burstSourceAmount}
        categoryName={burstCategoryName}
      />
    </div>
  );
}
