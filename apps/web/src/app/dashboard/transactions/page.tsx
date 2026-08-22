"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";

const formatAUD = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
};

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "TRANSFER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"recordedAt" | "description" | "amount">("recordedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const categoriesQuery = trpc.listCategories.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100, offset: 0 });

  const categories = categoriesQuery.data ?? [];

  // Map transaction ledger items for spacious display and group internal transfer pairs
  const allTransactions = useMemo(() => {
    const rawTransactions = transactionsQuery.data ?? [];
    const result: Array<{
      id: string;
      date: string;
      description: string;
      categoryName: string;
      amount: string;
      type: "DEBIT" | "CREDIT" | "TRANSFER";
    }> = [];

    const processedIds = new Set<string>();

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

        result.push({
          id: tx.id,
          date: tx.recordedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(tx.recordedAt)) : "N/A",
          description: tx.note || "Internal Transfer",
          categoryName: "Internal Transfer",
          amount: tx.amount,
          type: "TRANSFER",
        });
      } else {
        processedIds.add(tx.id);
        result.push({
          id: tx.id,
          date: tx.recordedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(tx.recordedAt)) : "N/A",
          description: tx.note || `Transaction (${tx.source})`,
          categoryName: tx.categoryName || "Uncategorized",
          amount: tx.amount,
          type: tx.flowType as "DEBIT" | "CREDIT",
        });
      }
    }

    return result;
  }, [transactionsQuery.data]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType !== "ALL" && tx.type !== filterType) return false;

      if (selectedCategory !== "ALL" && tx.categoryName !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allTransactions, filterType, selectedCategory, searchQuery]);

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

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            {t("transactions.title") || "Transactions History"}
          </h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            {t("transactions.subtitle") || "Complete itemized ledger of income allocations, bill payments, and spend transactions."}
          </p>
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
              {tType === "ALL" ? (t("transactions.filterAll") || "All") : tType === "DEBIT" ? (t("transactions.filterDebit") || "Debits (-)") : tType === "CREDIT" ? (t("transactions.filterCredit") || "Credits (+)") : (t("transactions.filterTransfer") || "Transfers")}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder={t("transactions.searchPlaceholder") || "Search description or category..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
        >
          <option value="ALL">{t("transactions.allCategories") || "All Categories"}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
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
                {sortedTransactions.map((tx) => (
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
    </div>
  );
}
