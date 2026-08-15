"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "../../../lib/trpc";
import { formatCurrency } from "@money-matters/ui";

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categoriesQuery = trpc.listCategories.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 100, offset: 0 });

  const categories = categoriesQuery.data ?? [];

  // Map transaction ledger items for spacious display
  const allTransactions = useMemo(() => {
    // Move the initialization inside useMemo to avoid changing dependencies on every render
    const rawTransactions = transactionsQuery.data ?? [];
    
    return rawTransactions.map((tx) => ({
      id: tx.id,
      date: tx.recordedAt ? new Date(tx.recordedAt).toISOString().split("T")[0] : "N/A",
      description: tx.note || `Transaction (${tx.source})`,
      categoryName: tx.categoryName || "Uncategorized",
      amount: tx.amount,
      type: tx.flowType as "DEBIT" | "CREDIT",
    }));
  }, [transactionsQuery.data]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType === "DEBIT" && tx.type !== "DEBIT") return false;
      if (filterType === "CREDIT" && tx.type !== "CREDIT") return false;

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

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--dash-text)" }}>
            Transactions History
          </h1>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Complete itemized ledger of income allocations, bill payments, and spend transactions.
          </p>
        </div>

        {/* Permanent 3-Way Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto">
          {(["ALL", "DEBIT", "CREDIT"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === t
                  ? "bg-white text-[#2563eb] shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t === "ALL" ? "All" : t === "DEBIT" ? "Debits (-)" : "Credits (+)"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search description or category..."
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
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-zinc-400">
            No transactions found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500">{tx.date}</td>
                    <td className="py-3 px-4 font-semibold text-[#1B2B4B]">{tx.description}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-zinc-700">
                        {tx.categoryName}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                      tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
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
