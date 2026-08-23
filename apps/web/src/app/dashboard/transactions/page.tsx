"use client";

import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip, SearchInput, PaginationBar } from "@money-matters/ui/web";

const formatAUD = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
};

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "TRANSFER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPool, setSelectedPool] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"recordedAt" | "description" | "amount">("recordedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const categoriesQuery = trpc.listCategories.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500, offset: 0 });

  useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery, selectedPool, sortColumn, sortDirection]);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  // Map transaction ledger items for spacious display and group internal transfer pairs
  const allTransactions = useMemo(() => {
    const rawTransactions = transactionsQuery.data ?? [];
    const result: Array<{
      id: string;
      date: string;
      description: string;
      categoryName: string;
      categoryType?: "EVERYDAY" | "REGULAR" | "GOAL";
      amount: string;
      type: "DEBIT" | "CREDIT" | "TRANSFER";
      source?: string;
    }> = [];

    const processedIds = new Set<string>();
    const categoryMap = new Map(categories.map((c) => [c.name, c.type]));

    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = rawTransactions[i];
      if (processedIds.has(tx.id)) continue;

      const isTransferNote = Boolean(tx.transferGroupId) || tx.note?.startsWith("Transferred");
      const partner = isTransferNote
        ? rawTransactions.find(
            (other) =>
              other.id !== tx.id &&
              !processedIds.has(other.id) &&
              other.amount === tx.amount &&
              other.flowType !== tx.flowType &&
              other.note === tx.note
          )
        : null;

      if (partner) {
        processedIds.add(tx.id);
        processedIds.add(partner.id);

        const sourceCatName = (tx.flowType === "DEBIT" ? tx.categoryName : partner.categoryName) || "Source Pool";
        const destCatName = (tx.flowType === "CREDIT" ? tx.categoryName : partner.categoryName) || "Destination Pool";

        result.push({
          id: tx.id,
          date: tx.recordedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(tx.recordedAt)) : "N/A",
          description: tx.note || "Transfer between categories",
          categoryName: `${sourceCatName} ➔ ${destCatName}`,
          amount: tx.amount,
          type: "TRANSFER",
          source: tx.source || "MANUAL",
        });
      } else {
        processedIds.add(tx.id);
        const catName = tx.categoryName || "Uncategorized";
        result.push({
          id: tx.id,
          date: tx.recordedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(tx.recordedAt)) : "N/A",
          description: tx.note || `Transaction (${tx.source || 'MANUAL'})`,
          categoryName: catName,
          categoryType: categoryMap.get(catName) as "EVERYDAY" | "REGULAR" | "GOAL" | undefined,
          amount: tx.amount,
          type: tx.flowType as "DEBIT" | "CREDIT",
          source: tx.source || "MANUAL",
        });
      }
    }

    return result;
  }, [transactionsQuery.data, categories]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType !== "ALL" && tx.type !== filterType) return false;

      if (selectedPool !== "ALL" && tx.categoryType !== selectedPool) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allTransactions, filterType, selectedPool, searchQuery]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "recordedAt") {
        cmp = a.date.localeCompare(b.date);
      } else if (sortColumn === "description") {
        cmp = a.description.localeCompare(b.description);
      } else if (sortColumn === "amount") {
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredTransactions, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, page, pageSize]);

  const handleExportCSV = () => {
    if (sortedTransactions.length === 0) return;
    const headers = ["Date", "Description", "Category / Pool", "Type", "Source", "Amount (AUD)"];
    const rows = sortedTransactions.map((tx) => [
      `"${tx.date}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.categoryName.replace(/"/g, '""')}"`,
      `"${tx.type === 'TRANSFER' ? 'Transfer' : tx.type === 'CREDIT' ? 'Income' : 'Expense'}"`,
      `"${tx.source || 'MANUAL'}"`,
      `"${tx.amount}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            {t("transactions.title") || "Transactions History"}
          </h1>
          <InfoTooltip
            title="About Transactions History"
            content="A complete record of all your earnings, bill payments, and everyday spending. Use filters or search to quickly find any past transaction."
          />
        </div>

        {/* Permanent 3-Way Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto">
          {(["ALL", "DEBIT", "CREDIT", "TRANSFER"] as const).map((tType) => (
            <button
              key={tType}
              type="button"
              onClick={() => setFilterType(tType)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === tType
                  ? "bg-white text-[#2563eb] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tType === "ALL" ? "All" : tType === "DEBIT" ? "Expense" : tType === "CREDIT" ? "Income" : "Transfers"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar & Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("transactions.searchPlaceholder") || "Search description or category name..."}
          />

          <select
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
          >
            <option value="ALL">All Pools</option>
            <option value="EVERYDAY">Everyday Spending Pool</option>
            <option value="REGULAR">Regular Bills Pool</option>
            <option value="GOAL">Savings &amp; Future Goals Pool</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={sortedTransactions.length === 0}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          <span>📥</span>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        {sortedTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-zinc-400">
            {t("transactions.noTransactionsFound") || "No transactions found matching the selected filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100" 
                    onClick={() => {
                      if (sortColumn === 'recordedAt') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortColumn('recordedAt'); setSortDirection('desc'); }
                    }}
                  >
                    {t("transactions.date") || "Date"} {sortColumn === 'recordedAt' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      if (sortColumn === 'description') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortColumn('description'); setSortDirection('asc'); }
                    }}
                  >
                    {t("transactions.description") || "Description"} {sortColumn === 'description' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="py-3 px-4">{t("transactions.category") || "Category"}</th>
                  <th className="py-3 px-4">Origin / Source</th>
                  <th 
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      if (sortColumn === 'amount') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSortColumn('amount'); setSortDirection('desc'); }
                    }}
                  >
                    {t("transactions.amount") || "Amount"} {sortColumn === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500">{tx.date}</td>
                    <td className="py-3 px-4 font-semibold text-[#1B2B4B]">{tx.description}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        tx.type === 'TRANSFER' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-zinc-700'
                      }`}>
                        {tx.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-100 text-zinc-500 border border-zinc-200">
                        {tx.source || "MANUAL"}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                      tx.type === 'TRANSFER' ? 'text-blue-600' : tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'TRANSFER' ? '🔄 ' : tx.type === 'CREDIT' ? '+' : '-'}{formatAUD(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedTransactions.length}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />
    </div>
  );
}
