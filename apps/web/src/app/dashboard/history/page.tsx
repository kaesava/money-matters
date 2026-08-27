"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip, SearchInput, PaginationBar, fmtDate, useResizableColumns, ResizableTh, Tabs, Spinner } from "@money-matters/ui/web";
import { SlideOverAllocationDrawer, PaydayPlanRecord } from "../../../components/web/SlideOverAllocationDrawer";

const formatAUD = (val: number | string): string => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(num);
};



function TransactionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "transactions";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Tab 1 state
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "TRANSFER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPool, setSelectedPool] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"recordedAt" | "description" | "amount">("recordedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activePlanForDrawer, setActivePlanForDrawer] = useState<PaydayPlanRecord | null>(null);

  const { widths, onMouseDown } = useResizableColumns({
    date: 140,
    description: 280,
    category: 180,
    source: 140,
    amount: 140,
  });

  const categoriesQuery = trpc.listCategories.useQuery();
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 500, offset: 0 });
  const paydayPlansQuery = trpc.listAllAllocationPlans.useQuery(undefined, {
    enabled: activeTab === "payday-allocations",
  });

  useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery, selectedPool, sortColumn, sortDirection]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/history?tab=${tabId}`, { scroll: false });
  };

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  // Map transaction ledger items for spacious display and group internal transfer pairs
  const allTransactions = useMemo(() => {
    const rawTransactions = transactionsQuery.data ?? [];
    const result: Array<{
      id: string;
      recordedAt: string | Date;
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
          recordedAt: tx.recordedAt,
          date: fmtDate(tx.recordedAt),
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
          recordedAt: tx.recordedAt,
          date: fmtDate(tx.recordedAt),
          description: tx.note || `Transaction (${tx.source || "MANUAL"})`,
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
        cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
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
      `"${tx.type === "TRANSFER" ? "Transfer" : tx.type === "CREDIT" ? "Income" : "Expense"}"`,
      `"${tx.source || "MANUAL"}"`,
      `"${tx.amount}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
    link.setAttribute("download", `transactions_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabsList = [
    { id: "transactions", label: t("transactions.tabs.transactions") || "Transactions" },
    { id: "payday-allocations", label: t("transactions.tabs.paydayAllocations") || "Payday Allocations" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
            {t("transactions.title") || "History"}
          </h1>
          <InfoTooltip
            title="About History & Allocations"
            content="A complete record of your itemized spending ledger and automated payday waterfall allocations."
          />
        </div>
      </div>

      {/* 2-Tab Navigation Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={handleTabChange} />

      {/* Tab 1: Itemized Transactions Ledger */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Controls Bar & Segmented Filter */}
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

              <div className="flex items-center bg-white p-1 rounded-xl border border-zinc-200">
                {(["ALL", "DEBIT", "CREDIT", "TRANSFER"] as const).map((tType) => (
                  <button
                    key={tType}
                    type="button"
                    onClick={() => setFilterType(tType)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      filterType === tType
                        ? "bg-[#2563eb] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {tType === "ALL" ? "All" : tType === "DEBIT" ? "Spent" : tType === "CREDIT" ? "Income" : "Transfers"}
                  </button>
                ))}
              </div>
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
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            {sortedTransactions.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs font-semibold">
                No transaction records found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <ResizableTh
                        width={widths.date}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("date", e)}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "recordedAt") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("recordedAt"); setSortDirection("desc"); }
                        }}
                      >
                        {t("transactions.date") || "Date"} {sortColumn === "recordedAt" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </ResizableTh>
                      <ResizableTh
                        width={widths.description}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("description", e)}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "description") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("description"); setSortDirection("asc"); }
                        }}
                      >
                        {t("transactions.description") || "Description"} {sortColumn === "description" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </ResizableTh>
                      <ResizableTh width={widths.category} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("category", e)} className="py-3 px-4">{t("transactions.category") || "Category"}</ResizableTh>
                      <ResizableTh width={widths.source} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("source", e)} className="py-3 px-4">Source</ResizableTh>
                      <ResizableTh
                        width={widths.amount}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("amount", e)}
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "amount") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("amount"); setSortDirection("desc"); }
                        }}
                      >
                        {t("transactions.amount") || "Amount"} {sortColumn === "amount" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </ResizableTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500">{fmtDate(tx.date)}</td>
                        <td className="py-3 px-4 font-semibold text-[#1B2B4B]">{tx.description}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            tx.type === "TRANSFER" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-zinc-700"
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
                          tx.type === "TRANSFER" ? "text-blue-600" : tx.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {tx.type === "TRANSFER" ? "🔄 " : tx.type === "CREDIT" ? "+" : "-"}{formatAUD(tx.amount)}
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
      )}

      {/* Tab 2: Payday Waterfall Allocation History */}
      {activeTab === "payday-allocations" && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#1B2B4B] mb-1">
                Payday Allocation History
              </h2>
              <p className="text-xs text-slate-500">
                Audit log of all 5-step waterfall allocations executed when income landed.
              </p>
            </div>

            <button
              onClick={() => {
                if (!paydayPlansQuery.data) return;
                const headers = ["Date", "Income Source", "Receiving Bank Account", "Total Income Amount", "Pool/Category", "Allocated Amount", "Reasoning"];
                const rows: string[][] = [];

                for (const plan of (paydayPlansQuery.data as unknown as PaydayPlanRecord[])) {
                  const dateStr = fmtDate(plan.expectedDate || plan.createdAt);
                  const incName = plan.incomeName || "Income Deposit";
                  const bankName = plan.receivingAccountName || "Main Account";
                  const totalAmt = plan.totalIncomeAmount;

                  for (const line of plan.lines) {
                    rows.push([
                      dateStr,
                      `"${incName.replace(/"/g, '""')}"`,
                      `"${bankName.replace(/"/g, '""')}"`,
                      totalAmt,
                      `"${(line.categoryName || "Unknown").replace(/"/g, '""')}"`,
                      line.confirmedAmount || line.proposedAmount,
                      `"${(line.reasoning || "").replace(/"/g, '""')}"`,
                    ]);
                  }
                }

                const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
                link.setAttribute("download", `money_matters_payday_allocations_${todayStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>📥</span>
              <span>Export Allocations CSV</span>
            </button>
          </div>

          {paydayPlansQuery.isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : !paydayPlansQuery.data || paydayPlansQuery.data.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-400 font-semibold">
              No payday allocation plans recorded yet. Allocations will appear here when you process your pay.
            </div>
          ) : (
            <div className="space-y-3">
              {(paydayPlansQuery.data as unknown as PaydayPlanRecord[]).map((plan) => (
                <div key={plan.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold flex items-center justify-center text-lg shrink-0">
                      💰
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">
                          {plan.status || "CONFIRMED"}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-600">
                          📅 {fmtDate(plan.expectedDate || plan.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1B2B4B] mt-1">
                        {plan.incomeName || "Income Deposit"} → <span className="font-medium text-zinc-500">{plan.receivingAccountName || "Main Account"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-auto sm:ml-0">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Total Income</p>
                      <p className="text-sm font-extrabold font-mono text-[#2563eb]">
                        {formatAUD(plan.totalIncomeAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActivePlanForDrawer(plan)}
                      className="px-3.5 py-2 text-xs font-bold text-[#2563eb] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors shrink-0"
                    >
                      View Allocation Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <SlideOverAllocationDrawer
            isOpen={!!activePlanForDrawer}
            onClose={() => setActivePlanForDrawer(null)}
            plan={activePlanForDrawer}
          />
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading history...</div>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
