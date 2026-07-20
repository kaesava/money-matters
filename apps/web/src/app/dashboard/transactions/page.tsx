"use client";
import React, { useState } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { DashboardError } from "../../../components/web/DashboardError";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  const categoriesQuery = trpc.listCategories.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 50, offset: 0 });

  const categories = categoriesQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  const filteredTransactions = selectedCategoryFilter === "ALL"
    ? transactions
    : transactions.filter((tx) => tx.categoryId === selectedCategoryFilter);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("transactions.title", { defaultValue: "Transactions Ledger" })}
          </h1>
          <p className="text-sm font-semibold text-zinc-500 mt-1">
            Real-time audit log of all income allocations and recorded expenses.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Filter Category:</label>
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B4A6]"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      {transactionsQuery.isLoading ? (
        <div className="h-64 rounded-2xl animate-pulse bg-zinc-200/50" />
      ) : transactionsQuery.error ? (
        <DashboardError error={transactionsQuery.error} onRetry={() => transactionsQuery.refetch()} />
      ) : filteredTransactions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-zinc-100 text-center flex flex-col items-center gap-2">
          <span className="text-3xl">🧾</span>
          <p className="text-sm font-semibold text-zinc-700">No transactions found.</p>
          <p className="text-xs text-zinc-400">Recorded expenses and allocations will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Flow</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Note</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.flowType === "CREDIT";
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isCredit ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {tx.flowType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#1B2B4B]">
                        {tx.categoryName || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 max-w-xs truncate">
                        {tx.note || "—"}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-medium">
                        {tx.source}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                        {new Date(tx.recordedAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-extrabold tabular-nums whitespace-nowrap text-sm ${
                          isCredit ? "text-emerald-600" : "text-zinc-900"
                        }`}
                      >
                        {isCredit ? `+${fmt(tx.amount)}` : `-${fmt(tx.amount)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
