"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { FilterBar } from "../../../../components/web/FilterBar";
import { PaginationBar } from "@money-matters/ui/web";

type SortField = "recordedAt" | "amount" | "categoryName";
type SortDir = "asc" | "desc";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSearch = searchParams.get("search") || searchParams.get("q") || "";
  const paramCategory = searchParams.get("categoryId") || "ALL";

  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500 });
  const categoriesQuery = trpc.listCategories.useQuery();

  interface TransactionItem {
    id: string;
    recordedAt: string | Date;
    categoryId: string;
    categoryName?: string;
    amount: string;
    flowType: "DEBIT" | "CREDIT";
    source?: string;
    note?: string | null;
  }

  const transactions = (transactionsQuery.data as TransactionItem[]) ?? [];
  const categories = categoriesQuery.data ?? [];

  const [searchQuery, setSearchQuery] = useState(paramSearch);
  const [flowFilter, setFlowFilter] = useState("ALL");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState(paramCategory);

  useEffect(() => {
    if (paramSearch) setSearchQuery(paramSearch);
    if (paramCategory) setCategoryFilter(paramCategory);
  }, [paramSearch, paramCategory]);

  const [sortField, setSortField] = useState<SortField>("recordedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, flowFilter, categoryTypeFilter, categoryFilter, sortField, sortDir, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = transactions.filter((tx: TransactionItem) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !tx.note?.toLowerCase().includes(q) && !tx.categoryName?.toLowerCase().includes(q) && !tx.amount.includes(q)) return false;
    if (flowFilter !== "ALL" && tx.flowType !== flowFilter) return false;
    if (categoryTypeFilter !== "ALL") {
      const cat = categories.find((c) => c.id === tx.categoryId);
      if (!cat || cat.type !== categoryTypeFilter) return false;
    }
    if (categoryFilter !== "ALL" && tx.categoryId !== categoryFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a: TransactionItem, b: TransactionItem) => {
    let comparison = 0;
    if (sortField === "recordedAt") comparison = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    else if (sortField === "amount") comparison = parseFloat(a.amount) - parseFloat(b.amount);
    else if (sortField === "categoryName") comparison = (a.categoryName || "").localeCompare(b.categoryName || "");
    return sortDir === "asc" ? comparison : -comparison;
  });

  const _totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = () => {
    if (sorted.length === 0) return;
    const headers = ["Date", "Bucket", "Flow", "Amount", "Source", "What for"];
    const rows = sorted.map((tx: TransactionItem) => [
      `"${new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(tx.recordedAt))}"`,
      `"${tx.categoryName || "Uncategorized"}"`,
      `"${tx.flowType}"`,
      `"${tx.amount}"`,
      `"${tx.source || "MANUAL"}"`,
      `"${(tx.note || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `history_export_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 mb-2 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("transactions.title")}</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Everything you&apos;ve recorded — spending and income.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 p-1 rounded-xl gap-0.5">
            {(["ALL", "DEBIT", "CREDIT"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlowFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  flowFilter === f
                    ? f === "DEBIT" ? "bg-rose-600 text-white shadow-sm"
                    : f === "CREDIT" ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-[#1B2B4B] shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {f === "ALL" ? "All" : f === "DEBIT" ? "Spent (−)" : "Income (+)"}
              </button>
            ))}
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
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search note, bucket, amount..."
        filterGroups={[
          {
            label: "Bucket type",
            value: categoryTypeFilter,
            onChange: setCategoryTypeFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "EVERYDAY", label: "Everyday stuff" },
              { id: "REGULAR", label: "Bills pile" },
              { id: "GOAL", label: "Savings" },
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

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th onClick={() => toggleSort("recordedAt")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Date {sortField === "recordedAt" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("categoryName")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Bucket {sortField === "categoryName" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th onClick={() => toggleSort("amount")} className="px-6 py-4 cursor-pointer hover:text-zinc-700">
                Amount {sortField === "amount" && (sortDir === "asc" ? "▲" : "▼")}
              </th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">What for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transactionsQuery.isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">Loading your history...</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">{t("transactions.empty")}</td></tr>
            ) : (
              paginated.map((tx: TransactionItem) => {
                const isDebit = tx.flowType === "DEBIT";
                return (
                  <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-4 text-zinc-500 font-medium">
                      {new Date(tx.recordedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/categories?search=${encodeURIComponent(tx.categoryName || "")}`} className="font-bold text-[#00B4A6] hover:underline cursor-pointer">
                        {tx.categoryName || "Uncategorized"}
                      </Link>
                    </td>
                    <td className={`px-6 py-4 font-mono font-extrabold ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                      {isDebit ? "-" : "+"}{fmt(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${tx.source === "AUTO" ? "bg-teal-50 text-[#00B4A6] border border-teal-200" : "bg-zinc-100 text-zinc-700 border border-zinc-200"}`}>
                        {tx.source || "MANUAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 max-w-[200px] truncate cursor-help" title={tx.note || undefined}>
                      {tx.note || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={page}
        totalPages={_totalPages}
        pageSize={pageSize}
        totalItems={sorted.length}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
