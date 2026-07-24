"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

type IncomeType = "SALARY" | "WAGES" | "FREELANCE" | "OTHER";
type ExpenseType = "UTILITY" | "SUBSCRIPTION" | "RENT_MORTGAGE" | "INSURANCE" | "OTHER";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IncomeAndExpensesPage() {
  const router = useRouter();

  // Active Tab / Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [incomeType, setIncomeType] = useState<IncomeType>("SALARY");
  const [expenseType, setExpenseType] = useState<ExpenseType>("OTHER");
  const [categoryId, setCategoryId] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [frequency, setFrequency] = useState<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY">("FORTNIGHTLY");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");

  const sourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();

  const createIncomeSourceMutation = trpc.createIncomeSource.useMutation({
    onSuccess: () => {
      resetForm();
      sourcesQuery.refetch();
    },
  });

  const createExpenseSourceMutation = trpc.createExpenseSource.useMutation({
    onSuccess: () => {
      resetForm();
      expenseSourcesQuery.refetch();
    },
  });

  const updateIncomeSourceMutation = trpc.updateIncomeSource.useMutation({
    onSuccess: () => {
      resetForm();
      sourcesQuery.refetch();
    },
  });

  const updateExpenseSourceMutation = trpc.updateExpenseSource.useMutation({
    onSuccess: () => {
      resetForm();
      expenseSourcesQuery.refetch();
    },
  });

  const archiveIncomeSourceMutation = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      resetForm();
      sourcesQuery.refetch();
    },
  });

  const archiveExpenseSourceMutation = trpc.archiveExpenseSource.useMutation({
    onSuccess: () => {
      resetForm();
      expenseSourcesQuery.refetch();
    },
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        resetForm();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setName("");
    setAmount("");
    setIncomeType("SALARY");
    setExpenseType("OTHER");
    setCategoryId("");
    setIsRecurring(true);
    setStartDate(new Date().toISOString().split("T")[0]);
    setFrequency("FORTNIGHTLY");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;

    if (modalMode === "INCOME") {
      if (editingItem) {
        updateIncomeSourceMutation.mutate({
          id: editingItem.id,
          data: {
            name: name.trim(),
            type: incomeType,
            amount: parseFloat(amount).toFixed(2),
          },
        });
      } else {
        createIncomeSourceMutation.mutate({
          name: name.trim(),
          type: incomeType,
          amount: parseFloat(amount).toFixed(2),
        });
      }
    } else {
      if (editingItem) {
        updateExpenseSourceMutation.mutate({
          id: editingItem.id,
          data: {
            name: name.trim(),
            type: expenseType,
            amount: parseFloat(amount).toFixed(2),
            categoryId: categoryId || undefined,
          },
        });
      } else {
        createExpenseSourceMutation.mutate({
          name: name.trim(),
          type: expenseType,
          amount: parseFloat(amount).toFixed(2),
          categoryId: categoryId || undefined,
          isRecurring,
          startDate,
          frequency,
        });
      }
    }
  };

  const handleEditClick = (item: any, mode: "INCOME" | "EXPENSE") => {
    setModalMode(mode);
    setEditingItem(item);
    setName(item.name);
    setAmount(parseFloat(item.amount).toFixed(2));
    if (mode === "INCOME") {
      setIncomeType(item.type);
    } else {
      setExpenseType(item.type);
      setCategoryId(item.categoryId || "");
    }
    setIsRecurring(!!item.rrule);
    if (item.startDate) setStartDate(item.startDate.split("T")[0]);
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string, mode: "INCOME" | "EXPENSE") => {
    if (!confirm(`Are you sure you want to archive this ${mode.toLowerCase()} source?`)) return;
    if (mode === "INCOME") {
      archiveIncomeSourceMutation.mutate({ id });
    } else {
      archiveExpenseSourceMutation.mutate({ id });
    }
  };

  let incomeSourcesList = sourcesQuery.data ?? [];
  let expenseSourcesList = expenseSourcesQuery.data ?? [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    incomeSourcesList = incomeSourcesList.filter((s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
    expenseSourcesList = expenseSourcesList.filter((s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2B4B]">Income & Expenses</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Configure recurring and one-off income sources and bills</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); setModalMode("INCOME"); setShowAddModal(true); }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm"
          >
            + Add Income Source
          </button>
          <button
            onClick={() => { resetForm(); setModalMode("EXPENSE"); setShowAddModal(true); }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1B2B4B] hover:opacity-90 transition-all shadow-sm"
          >
            + Add Expense Source
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-between">
        <input
          type="text"
          placeholder="Search income and expense sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        />
      </div>

      {/* Split Tables Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Income Sources */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
              <span>💵</span> Income Sources
            </h2>
            <span className="text-xs font-semibold text-zinc-400">{incomeSourcesList.length} total</span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Expected Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-semibold">
              {incomeSourcesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">No income sources configured.</td>
                </tr>
              ) : (
                incomeSourcesList.map((src) => (
                  <tr key={src.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-[#1B2B4B] font-bold">{src.name}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800">
                        {src.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-600 font-bold">+{fmt(src.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(src, "INCOME")} className="text-zinc-400 hover:text-[#1B2B4B]">Edit</button>
                        <button onClick={() => handleDeleteClick(src.id, "INCOME")} className="text-rose-400 hover:text-rose-600">Archive</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table 2: Expense Sources */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
              <span>📄</span> Expense Sources (Bills)
            </h2>
            <span className="text-xs font-semibold text-zinc-400">{expenseSourcesList.length} total</span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-semibold">
              {expenseSourcesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">No expense sources configured.</td>
                </tr>
              ) : (
                expenseSourcesList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 text-[#1B2B4B] font-bold">{exp.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{exp.categoryName || "Uncategorized"}</td>
                    <td className="px-4 py-3 font-mono text-[#1B2B4B] font-bold">-{fmt(exp.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(exp, "EXPENSE")} className="text-zinc-400 hover:text-[#1B2B4B]">Edit</button>
                        <button onClick={() => handleDeleteClick(exp.id, "EXPENSE")} className="text-rose-400 hover:text-rose-600">Archive</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1B2B4B]">
                {editingItem ? `Edit ${modalMode === "INCOME" ? "Income" : "Expense"} Source` : `New ${modalMode === "INCOME" ? "Income" : "Expense"} Source`}
              </h2>
              <button onClick={resetForm} className="text-zinc-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Name</label>
                <input
                  type="text"
                  required
                  placeholder={modalMode === "INCOME" ? "e.g. Primary Salary" : "e.g. Electricity Bill"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              {modalMode === "INCOME" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Income Type</label>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as any)}
                    className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                  >
                    <option value="SALARY">Salary</option>
                    <option value="WAGES">Wages</option>
                    <option value="FREELANCE">Freelance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Expense Type</label>
                    <select
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value as any)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="SUBSCRIPTION">Subscription</option>
                      <option value="RENT_MORTGAGE">Rent / Mortgage</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Linked Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                />
              </div>

              {!editingItem && (
                <>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00B4A6] focus:ring-[#00B4A6]"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-bold text-zinc-600 select-none">
                      Is this a recurring deposit/bill?
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {isRecurring ? "Start Date" : "Event Date"}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                    />
                  </div>

                  {isRecurring && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        className="px-4 py-2.5 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="FORTNIGHTLY">Fortnightly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUALLY">Annually</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                className="mt-2 py-3 rounded-xl font-bold text-sm text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md"
              >
                {editingItem ? "Save Changes" : `Save ${modalMode === "INCOME" ? "Income" : "Expense"} Source`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
