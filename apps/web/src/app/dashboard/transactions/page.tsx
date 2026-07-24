"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  // Filter State
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [flowFilter, setFlowFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort State (Default: descending date)
  const [sortField, setSortField] = useState<"date" | "category" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });
  const categoriesQuery = trpc.listCategories.useQuery();

  const transactions = (transactionsQuery.data as any) ?? [];
  const categories = categoriesQuery.data ?? [];

  // Filter Logic
  let filtered = [...transactions];

  if (flowFilter !== "ALL") {
    filtered = filtered.filter((t) => t.flowType === flowFilter);
  }

  if (categoryFilter !== "ALL") {
    filtered = filtered.filter((t) => t.categoryId === categoryFilter);
  }

  if (typeFilter !== "ALL") {
    const matchingCategoryIds = new Set(categories.filter((c) => c.type === typeFilter).map((c) => c.id));
    filtered = filtered.filter((t) => matchingCategoryIds.has(t.categoryId));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.categoryName || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        t.amount.includes(q)
    );
  }

  // Sort Logic
  filtered.sort((a, b) => {
    let comp = 0;
    if (sortField === "date") {
      comp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    } else if (sortField === "category") {
      comp = (a.categoryName || "").localeCompare(b.categoryName || "");
    } else if (sortField === "amount") {
      comp = parseFloat(a.amount) - parseFloat(b.amount);
    }
    return sortDir === "asc" ? comp : -comp;
  });

  const toggleSort = (field: "date" | "category" | "amount") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ["ID", "Date", "Category", "Flow", "Amount", "Source", "Note"];
    const rows = filtered.map((t) => [
      t.id,
      new Date(t.recordedAt).toISOString(),
      `"${t.categoryName || "Uncategorized"}"`,
      t.flowType,
      t.amount,
      t.source || "MANUAL",
      `"${(t.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1B2B4B]">Transactions</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">Audit log of all recorded expenses, income allocations, and transfers</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>📥</span> Export CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by category, note, or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6] w-full lg:w-72"
        />

        {/* Filter Groups */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Flow Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase px-2">Flow:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "DEBIT", label: "Debit (-)" },
              { id: "CREDIT", label: "Credit (+)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFlowFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  flowFilter === f.id ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Type Filter */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase px-2">Type:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "GOAL", label: "Save Toward" },
              { id: "REGULAR", label: "Regular Bills" },
              { id: "EVERYDAY", label: "Everyday" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  typeFilter === f.id ? "bg-white text-[#1B2B4B] shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th onClick={() => toggleSort("date")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Date {sortField === "date" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("category")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Category {sortField === "category" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Note / Source</th>
              <th onClick={() => toggleSort("amount")} className="px-6 py-4 cursor-pointer hover:text-zinc-700 text-right">
                Amount {sortField === "amount" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactionsQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-xs text-zinc-400">Loading transactions...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-xs text-zinc-400">No matching transactions found.</td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(tx.recordedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-[#1B2B4B] font-bold">{tx.categoryName || "Uncategorized"}</td>
                  <td className="px-6 py-4 text-zinc-500">
                    {tx.note || "—"} <span className="text-[10px] text-zinc-400">({tx.source || "MANUAL"})</span>
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold text-right ${tx.flowType === "DEBIT" ? "text-rose-600" : "text-emerald-600"}`}>
                    {tx.flowType === "DEBIT" ? "-" : "+"}{fmt(tx.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
