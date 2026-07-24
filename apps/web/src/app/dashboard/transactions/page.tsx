"use client";
import React, { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { FilterBar } from "../../../components/web/FilterBar";

type SortField = "recordedAt" | "amount" | "categoryName";
type SortDir = "asc" | "desc";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  const utils = trpc.useUtils();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100 });
  const categoriesQuery = trpc.listCategories.useQuery();

  const transactions = (transactionsQuery.data as any) ?? [];
  const categories = categoriesQuery.data ?? [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [flowFilter, setFlowFilter] = useState("ALL");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Sort State
  const [sortField, setSortField] = useState<SortField>("recordedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Grouping State for Payday and Move Money Batches
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Toggle Sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Filter Logic
  const filtered = transactions.filter((tx: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (
      q &&
      !tx.note?.toLowerCase().includes(q) &&
      !tx.categoryName?.toLowerCase().includes(q) &&
      !tx.amount.includes(q)
    ) {
      return false;
    }

    if (flowFilter !== "ALL" && tx.flowType !== flowFilter) return false;

    if (categoryTypeFilter !== "ALL") {
      const cat = categories.find((c) => c.id === tx.categoryId);
      if (!cat || cat.type !== categoryTypeFilter) return false;
    }

    if (categoryFilter !== "ALL" && tx.categoryId !== categoryFilter) return false;

    return true;
  });

  // Sort Logic
  const sorted = [...filtered].sort((a: any, b: any) => {
    let comparison = 0;
    if (sortField === "recordedAt") {
      comparison = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    } else if (sortField === "amount") {
      comparison = parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortField === "categoryName") {
      comparison = (a.categoryName || "").localeCompare(b.categoryName || "");
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  // CSV Export
  const handleExportCsv = () => {
    if (sorted.length === 0) return;
    const headers = ["Date", "Category", "Flow", "Amount", "Source", "Note"];
    const rows = sorted.map((tx: any) => [
      `"${new Date(tx.recordedAt).toISOString().split("T")[0]}"`,
      `"${tx.categoryName || "Uncategorized"}"`,
      `"${tx.flowType}"`,
      `"${tx.amount}"`,
      `"${tx.source || "MANUAL"}"`,
      `"${(tx.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">Transaction History</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Audit log of all manual and imported ledger debits and credits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sorted.length === 0}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-zinc-100 text-[#1B2B4B] hover:bg-zinc-200 border border-zinc-200 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <span>📥</span>
          <span>Export CSV ({sorted.length})</span>
        </button>
      </div>

      {/* Consistent Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search note, category, amount..."
        filterGroups={[
          {
            label: "Flow",
            value: flowFilter,
            onChange: setFlowFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "DEBIT", label: "Debits (-)" },
              { id: "CREDIT", label: "Credits (+)" },
            ],
          },
          {
            label: "Category Type",
            value: categoryTypeFilter,
            onChange: setCategoryTypeFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "EVERYDAY", label: "Everyday" },
              { id: "REGULAR", label: "Regular Bills" },
              { id: "GOAL", label: "Save Toward" },
            ],
          },
        ]}
        onClearAll={() => {
          setSearchQuery("");
          setFlowFilter("ALL");
          setCategoryTypeFilter("ALL");
          setCategoryFilter("ALL");
        }}
      />

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th onClick={() => toggleSort("recordedAt")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Date & Time {sortField === "recordedAt" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("categoryName")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Category {sortField === "categoryName" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Flow</th>
              <th onClick={() => toggleSort("amount")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Amount {sortField === "amount" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Note / Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactionsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">
                  Loading transactions...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">
                  No matching transactions found.
                </td>
              </tr>
            ) : (
              sorted.map((tx: any) => {
                const isDebit = tx.flowType === "DEBIT";
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-4 text-zinc-500 font-medium">
                      {new Date(tx.recordedAt).toLocaleString("en-AU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/dashboard/categories?search=${encodeURIComponent(tx.categoryName || "")}`}
                        className="font-bold text-[#00B4A6] hover:underline cursor-pointer"
                      >
                        {tx.categoryName || "Uncategorized"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isDebit ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isDebit ? "Debit (-)" : "Credit (+)"}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-mono font-extrabold ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                      {isDebit ? "-" : "+"}{fmt(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          tx.source === "AUTO"
                            ? "bg-teal-50 text-[#00B4A6] border border-teal-200"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        }`}
                      >
                        {tx.source || "MANUAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 truncate max-w-xs">{tx.note || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
