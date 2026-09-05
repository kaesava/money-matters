"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip, SearchInput, PaginationBar, fmtDate, useResizableColumns, ResizableTh, Tabs, Spinner, SkeletonTable } from "@money-matters/ui/web";
import { SlideOverAllocationDrawer, PaydayPlanRecord } from "../../../components/web/SlideOverAllocationDrawer";
import { getTenantDateString } from "@money-matters/core";

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
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
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
  const poolsQuery = trpc.listPools.useQuery();
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
  const pools = useMemo(() => poolsQuery.data ?? [], [poolsQuery.data]);
  const poolMap = useMemo(() => new Map(pools.map((p) => [p.id, p.name])), [pools]);

  // Map transaction ledger items for spacious display and group internal transfer pairs
  const allTransactions = useMemo(() => {
    const rawTransactions = transactionsQuery.data ?? [];
    const result: Array<{
      id: string;
      recordedAt: string | Date;
      date: string;
      description: string;
      categoryName: string;
      poolName?: string;
      rawCategoryName?: string;
      categoryType?: "EVERYDAY" | "REGULAR" | "GOAL";
      amount: string;
      type: "DEBIT" | "CREDIT" | "TRANSFER";
      source?: string;
    }> = [];

    const processedIds = new Set<string>();
    const categoryMap = new Map(categories.map((c) => [c.name, (c as unknown as { poolType?: string; type?: string }).poolType || (c as unknown as { poolType?: string; type?: string }).type]));

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

        const txObj = tx as unknown as { poolId?: string; poolName?: string; categoryName?: string };
        const partnerObj = partner as unknown as { poolId?: string; poolName?: string; categoryName?: string };

        const txPoolName = txObj.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || txObj.categoryName;
        const partnerPoolName = partnerObj.poolName || (partner.poolId ? poolMap.get(partner.poolId) : undefined) || partnerObj.categoryName;

        const sourceCatName = (tx.flowType === "DEBIT" ? txPoolName : partnerPoolName) || "Everyday Pool";
        const destCatName = (tx.flowType === "CREDIT" ? txPoolName : partnerPoolName) || "Destination Pool";

        result.push({
          id: tx.id,
          recordedAt: tx.recordedAt,
          date: fmtDate(tx.recordedAt),
          description: tx.note || "Pool Transfer",
          categoryName: `${sourceCatName} ➔ ${destCatName}`,
          amount: tx.amount,
          type: "TRANSFER",
          source: tx.source || "MANUAL",
        });
      } else {
        processedIds.add(tx.id);
        const txObj = tx as unknown as { poolId?: string; poolName?: string; categoryName?: string };
        const pName = txObj.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || "";
        const cName = txObj.categoryName || "";
        const displayLabel = pName && cName ? `${pName} (${cName})` : pName || cName || "Everyday Pool";

        result.push({
          id: tx.id,
          recordedAt: tx.recordedAt,
          date: fmtDate(tx.recordedAt),
          description: tx.note || `Transaction (${tx.source || "MANUAL"})`,
          categoryName: displayLabel,
          poolName: pName,
          rawCategoryName: cName,
          categoryType: categoryMap.get(pName || cName) as "EVERYDAY" | "REGULAR" | "GOAL" | undefined,
          amount: tx.amount,
          type: tx.flowType as "DEBIT" | "CREDIT",
          source: tx.source || "MANUAL",
        });
      }
    }

    return result;
  }, [transactionsQuery.data, categories, poolMap]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType !== "ALL" && tx.type !== filterType) return false;
      if (selectedPool !== "ALL" && tx.categoryType !== selectedPool) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q) ||
          (tx.poolName && tx.poolName.toLowerCase().includes(q)) ||
          (tx.rawCategoryName && tx.rawCategoryName.toLowerCase().includes(q))
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
    const todayStr = getTenantDateString(new Date());
    link.setAttribute("download", `transactions_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabsList = [
    { id: "transactions", label: t("transactions.tabs.transactions") || "Transactions" },
    { id: "payday-allocations", label: t("transactions.tabs.paydayAllocations") || "Payday Allocations" },
  ];

  // Payday Allocations Table State
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [selectedBankFilter, setSelectedBankFilter] = useState("ALL");
  const [planSortColumn, setPlanSortColumn] = useState<"date" | "incomeName" | "receivingAccount" | "trigger" | "amount">("date");
  const [planSortDirection, setPlanSortDirection] = useState<"asc" | "desc">("desc");

  const { widths: planWidths, onMouseDown: onPlanMouseDown } = useResizableColumns({
    date: 140,
    incomeName: 240,
    receivingAccount: 220,
    trigger: 110,
    amount: 140,
    actions: 140,
  });

  const paydayPlans = useMemo(() => {
    return (paydayPlansQuery.data as unknown as PaydayPlanRecord[]) || [];
  }, [paydayPlansQuery.data]);

  const uniqueBankAccounts = useMemo(() => {
    const banks = new Set<string>();
    for (const p of paydayPlans) {
      if (p.receivingAccountName) banks.add(p.receivingAccountName);
    }
    return Array.from(banks);
  }, [paydayPlans]);

  const filteredPaydayPlans = useMemo(() => {
    return paydayPlans.filter((plan) => {
      if (selectedBankFilter !== "ALL" && (plan.receivingAccountName || "Main Account") !== selectedBankFilter) {
        return false;
      }
      if (planSearchQuery.trim()) {
        const q = planSearchQuery.toLowerCase().trim();
        const incName = (plan.incomeName || "Income Deposit").toLowerCase();
        const bankName = (plan.receivingAccountName || "Main Account").toLowerCase();
        const amtStr = String(plan.totalIncomeAmount);
        return incName.includes(q) || bankName.includes(q) || amtStr.includes(q);
      }
      return true;
    });
  }, [paydayPlans, selectedBankFilter, planSearchQuery]);

  const sortedPaydayPlans = useMemo(() => {
    return [...filteredPaydayPlans].sort((a, b) => {
      let cmp = 0;
      if (planSortColumn === "date") {
        const timeA = new Date(a.expectedDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.expectedDate || b.createdAt || 0).getTime();
        cmp = timeA - timeB;
      } else if (planSortColumn === "incomeName") {
        cmp = (a.incomeName || "").localeCompare(b.incomeName || "");
      } else if (planSortColumn === "receivingAccount") {
        cmp = (a.receivingAccountName || "").localeCompare(b.receivingAccountName || "");
      } else if (planSortColumn === "trigger") {
        cmp = (a.isAutoTrigger ? "AUTO" : "MANUAL").localeCompare(b.isAutoTrigger ? "AUTO" : "MANUAL");
      } else if (planSortColumn === "amount") {
        cmp = parseFloat(String(a.totalIncomeAmount || 0)) - parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredPaydayPlans, planSortColumn, planSortDirection]);

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
            content={t("transactions.historyTooltip")}
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
            {transactionsQuery.isLoading ? (
              <SkeletonTable cols={6} rows={pageSize} />
            ) : sortedTransactions.length === 0 ? (
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
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "recordedAt") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("recordedAt"); setSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{t("transactions.date") || "Date"}</span>
                          {sortColumn === "recordedAt" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>
                      <ResizableTh
                        width={widths.description}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("description", e)}
                        className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "description") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("description"); setSortDirection("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>{t("transactions.description") || "Description"}</span>
                          {sortColumn === "description" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>
                      <ResizableTh width={widths.category} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("category", e)} className="py-3 px-4 text-left">Pool</ResizableTh>
                      <ResizableTh width={widths.source} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("source", e)} className="py-3 px-4 text-center">Source</ResizableTh>
                      <ResizableTh
                        width={widths.amount}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("amount", e)}
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "amount") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("amount"); setSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t("transactions.amount") || "Amount"}</span>
                          {sortColumn === "amount" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500 text-center">{fmtDate(tx.date)}</td>
                        <td className="py-3 px-4 font-semibold text-[#1B2B4B] text-left">{tx.description}</td>
                        <td className="py-3 px-4 text-left">
                          {tx.categoryName.includes(" ➔ ") ? (() => {
                            const [fromPart, toPart] = tx.categoryName.split(" ➔ ");
                            const cleanFrom = fromPart.replace(/\s*\([^)]*\)$/, "");
                            const cleanTo = toPart.replace(/\s*\([^)]*\)$/, "");
                            return (
                              <span className="font-semibold text-[#1B2B4B] flex items-center gap-1">
                                <Link
                                  href={`/dashboard/pools?search=${encodeURIComponent(cleanFrom)}`}
                                  className="text-[#2563eb] hover:underline"
                                >
                                  {fromPart}
                                </Link>
                                <span className="text-zinc-400">➔</span>
                                <Link
                                  href={`/dashboard/pools?search=${encodeURIComponent(cleanTo)}`}
                                  className="text-[#2563eb] hover:underline"
                                >
                                  {toPart}
                                </Link>
                              </span>
                            );
                          })() : (
                            <Link
                              href={`/dashboard/pools?search=${encodeURIComponent(tx.poolName || tx.categoryName)}`}
                              className="font-semibold text-[#2563eb] hover:underline"
                            >
                              {tx.categoryName}
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
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

          {sortedTransactions.length >= 5 && (
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
          )}
        </div>
      )}

      {/* Tab 2: Payday Waterfall Allocation History */}
      {activeTab === "payday-allocations" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
              <SearchInput
                value={planSearchQuery}
                onChange={setPlanSearchQuery}
                placeholder="Search income, bank account, or amount..."
              />

              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
              >
                <option value="ALL">All Bank Accounts</option>
                {uniqueBankAccounts.map((bName) => (
                  <option key={bName} value={bName}>{bName}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!paydayPlansQuery.data) return;
                const headers = ["Date", "Income Source", "Receiving Bank Account", "Total Income Amount", "Pool/Category", "Allocated Amount", "Reasoning"];
                const rows: string[][] = [];

                for (const plan of paydayPlans) {
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
                const todayStr = getTenantDateString(new Date());
                link.setAttribute("download", `money_matters_payday_allocations_${todayStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              disabled={sortedPaydayPlans.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <span>📥</span>
              <span>Export Allocations CSV</span>
            </button>
          </div>

          {/* Payday Allocations Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            {paydayPlansQuery.isLoading ? (
              <div className="p-12 flex justify-center items-center">
                <Spinner size="lg" />
              </div>
            ) : sortedPaydayPlans.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 font-semibold">
                No payday allocation plans found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <ResizableTh
                        width={planWidths.date}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("date", e)}
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "date") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("date"); setPlanSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Date</span>
                          {planSortColumn === "date" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.incomeName}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("incomeName", e)}
                        className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "incomeName") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("incomeName"); setPlanSortDirection("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Description / Income</span>
                          {planSortColumn === "incomeName" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.receivingAccount}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("receivingAccount", e)}
                        className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "receivingAccount") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("receivingAccount"); setPlanSortDirection("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Bank Account</span>
                          {planSortColumn === "receivingAccount" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.trigger}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("trigger", e)}
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "trigger") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("trigger"); setPlanSortDirection("asc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Trigger</span>
                          {planSortColumn === "trigger" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.amount}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("amount", e)}
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "amount") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("amount"); setPlanSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Total Amount</span>
                          {planSortColumn === "amount" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.actions}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("actions", e)}
                        className="py-3 px-4 text-center"
                      >
                        <span>Actions</span>
                      </ResizableTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {sortedPaydayPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-zinc-500">
                          {fmtDate(plan.expectedDate || plan.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-[#1B2B4B]">
                          {plan.incomeName || "Income Deposit"}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold">
                          <Link href="/dashboard/bank-accounts" className="text-[#2563eb] hover:underline">
                            {plan.receivingAccountName || "Main Account"}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {plan.isAutoTrigger ? "AUTO" : "MANUAL"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#2563eb] tabular-nums">
                          {formatAUD(plan.totalIncomeAmount)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setActivePlanForDrawer(plan)}
                            className="px-3 py-1 text-xs font-bold text-[#2563eb] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

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
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
