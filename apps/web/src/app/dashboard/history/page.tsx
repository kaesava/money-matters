"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { trpc } from "../../../lib/trpc";
import { t } from "@money-matters/i18n";
import { InfoTooltip, SearchInput, PaginationBar, fmtDate, useResizableColumns, ResizableTh, Tabs, Spinner, SkeletonTable, PoolPicker, RecordFilterBadge } from "@money-matters/ui/web";
import { SlideOverAllocationDrawer, PaydayPlanRecord } from "../../../components/web/SlideOverAllocationDrawer";
import { getTenantDateString } from "@money-matters/core";
import { useLocale } from "../../../providers/LocaleProvider";

function TransactionsPageContent() {
  const { fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "transactions";
  const poolIdParam = searchParams.get("poolId") || searchParams.get("id") || "";
  const categoryIdParam = searchParams.get("categoryId") || "";
  const bankAccountIdParam = searchParams.get("bankAccountId") || "";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Tab 1 state
  const [filterType, setFilterType] = useState<"ALL" | "DEBIT" | "CREDIT" | "TRANSFER">("ALL");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedPool, setSelectedPool] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<"recordedAt" | "transactionType" | "description" | "amount">("recordedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activePlanForDrawer, setActivePlanForDrawer] = useState<PaydayPlanRecord | null>(null);

  const { widths, onMouseDown } = useResizableColumns({
    date: 120,
    type: 140,
    description: 260,
    category: 180,
    amount: 140,
  });

  const categoriesQuery = trpc.listCategories.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
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
  const bankAccounts = useMemo(() => bankAccountsQuery.data ?? [], [bankAccountsQuery.data]);
  const poolMap = useMemo(() => new Map(pools.map((p) => [p.id, p.name])), [pools]);


  // Map transaction ledger items for spacious display without grouping transfer pairs
  const allTransactions = useMemo(() => {
    const rawTransactions = transactionsQuery.data ?? [];
    const categoryMap = new Map(categories.map((c) => [c.name, (c as unknown as { poolType?: string; type?: string }).poolType || (c as unknown as { poolType?: string; type?: string }).type]));

    return rawTransactions.map((tx) => {
      const txObj = tx as unknown as { poolId?: string; poolName?: string; categoryName?: string };
      const pName = txObj.poolName || (tx.poolId ? poolMap.get(tx.poolId) : undefined) || "";
      const cName = txObj.categoryName || "";
      const displayLabel = pName && cName ? `${pName} (${cName})` : pName || cName || "Everyday Pool";

      const isTransfer = Boolean(tx.transferGroupId) || tx.note?.startsWith("Transferred") || tx.note?.startsWith("Transfer from") || tx.note?.includes("➔");

      return {
        id: tx.id,
        recordedAt: tx.recordedAt,
        date: fmtDate(tx.recordedAt),
        description: tx.note || `Transaction (${tx.source || "MANUAL"})`,
        categoryName: displayLabel,
        poolId: tx.poolId,
        categoryId: tx.categoryId,
        bankAccountId: tx.bankAccountId,
        transactionType: tx.transactionType,
        poolName: pName,
        rawCategoryName: cName,
        categoryType: categoryMap.get(pName || cName) as "EVERYDAY" | "REGULAR" | "GOAL" | undefined,
        amount: tx.amount,
        type: isTransfer ? ("TRANSFER" as const) : (tx.flowType as "DEBIT" | "CREDIT"),
        flowType: tx.flowType as "DEBIT" | "CREDIT",
        source: tx.source || "MANUAL",
      };
    });
  }, [transactionsQuery.data, categories, poolMap]);

  const matchedPool = poolIdParam ? pools.find((p) => p.id === poolIdParam) : null;
  const matchedCategory = categoryIdParam ? categories.find((c) => c.id === categoryIdParam) : null;
  const matchedBankAccount = bankAccountIdParam ? bankAccounts.find((b: { id: string }) => b.id === bankAccountIdParam) : null;

  const isFilterParamInvalid = Boolean(
    (poolIdParam && !matchedPool) ||
    (categoryIdParam && !matchedCategory) ||
    (bankAccountIdParam && !matchedBankAccount)
  );

  const getTransactionTypeLabel = (type?: string): string => {
    switch (type) {
      case "EXPENSE": return "Expense";
      case "INCOME_SPLIT": return "Income Split";
      case "INCOME_DIRECT": return "Direct Income";
      case "TRANSFER_OUT": return "Transfer Out";
      case "TRANSFER_IN": return "Transfer In";
      case "ACCOUNT_ALIGNMENT": return "Account Alignment";
      case "BALANCE_ADJUSTMENT": return "Balance Adjustment";
      case "OPENING_BALANCE": return "Opening Balance";
      default: return type ? type.replace(/_/g, " ") : "Transaction";
    }
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (filterType !== "ALL" && tx.type !== filterType) return false;
      if (poolIdParam && matchedPool && tx.poolId !== poolIdParam) return false;
      if (categoryIdParam && matchedCategory && tx.categoryId !== categoryIdParam) return false;
      if (bankAccountIdParam && matchedBankAccount && tx.bankAccountId !== bankAccountIdParam) return false;
      if (selectedPool !== "ALL") {
        const selectedPoolObj = pools.find((p) => p.id === selectedPool);
        const selectedName = selectedPoolObj?.name;
        const matchesPool = (tx.poolName && tx.poolName === selectedName) || tx.categoryName.includes(selectedName || selectedPool);
        if (!matchesPool) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.categoryName.toLowerCase().includes(q) ||
          (tx.poolName && tx.poolName.toLowerCase().includes(q)) ||
          (tx.rawCategoryName && tx.rawCategoryName.toLowerCase().includes(q)) ||
          tx.amount.includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, filterType, selectedPool, searchQuery, pools, poolIdParam, matchedPool, categoryIdParam, matchedCategory, bankAccountIdParam, matchedBankAccount]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "recordedAt") {
        cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      } else if (sortColumn === "transactionType") {
        cmp = (a.transactionType || "").localeCompare(b.transactionType || "");
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
    const headers = ["Date", "Transaction Type", "Description", "Category / Pool", "Source", "Amount (AUD)"];
    const rows = sortedTransactions.map((tx) => [
      `"${tx.date}"`,
      `"${getTransactionTypeLabel(tx.transactionType)}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.categoryName.replace(/"/g, '""')}"`,
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
    { id: "transactions", label: t("transactions.tabs.transactions") || "History" },
    { id: "payday-allocations", label: "Income Splits" },
  ];

  // Payday Allocations / Income Splits Table State
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [selectedBankFilter, setSelectedBankFilter] = useState("ALL");
  const [planSortColumn, setPlanSortColumn] = useState<"createdAt" | "expectedDate" | "incomeName" | "receivingAccount" | "amount">("createdAt");
  const [planSortDirection, setPlanSortDirection] = useState<"asc" | "desc">("desc");
  const [planPage, setPlanPage] = useState(1);
  const [planPageSize, setPlanPageSize] = useState(25);

  const { widths: planWidths, onMouseDown: onPlanMouseDown } = useResizableColumns({
    splitDate: 140,
    incomeDate: 130,
    incomeName: 280,
    receivingAccount: 200,
    amount: 140,
  });

  const paydayPlans = useMemo(() => {
    return (paydayPlansQuery.data as unknown as PaydayPlanRecord[]) || [];
  }, [paydayPlansQuery.data]);

  const uniqueBankAccounts = useMemo(() => {
    return bankAccounts.map((b: { name: string }) => b.name);
  }, [bankAccounts]);

  const filteredPaydayPlans = useMemo(() => {
    return paydayPlans.filter((plan) => {
      if (selectedBankFilter !== "ALL" && (plan.receivingAccountName || "Main Account") !== selectedBankFilter) {
        return false;
      }
      if (bankAccountIdParam && matchedBankAccount && plan.receivingAccountName !== matchedBankAccount.name) {
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
  }, [paydayPlans, selectedBankFilter, planSearchQuery, bankAccountIdParam, matchedBankAccount]);

  const sortedPaydayPlans = useMemo(() => {
    return [...filteredPaydayPlans].sort((a, b) => {
      let cmp = 0;
      if (planSortColumn === "createdAt") {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        cmp = timeA - timeB;
      } else if (planSortColumn === "expectedDate") {
        const timeA = new Date(a.expectedDate || 0).getTime();
        const timeB = new Date(b.expectedDate || 0).getTime();
        cmp = timeA - timeB;
      } else if (planSortColumn === "incomeName") {
        cmp = (a.incomeName || "").localeCompare(b.incomeName || "");
      } else if (planSortColumn === "receivingAccount") {
        cmp = (a.receivingAccountName || "").localeCompare(b.receivingAccountName || "");
      } else if (planSortColumn === "amount") {
        cmp = parseFloat(String(a.totalIncomeAmount || 0)) - parseFloat(String(b.totalIncomeAmount || 0));
      }
      return planSortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredPaydayPlans, planSortColumn, planSortDirection]);

  const planTotalPages = Math.ceil(sortedPaydayPlans.length / planPageSize) || 1;
  const paginatedPaydayPlans = useMemo(() => {
    const start = (planPage - 1) * planPageSize;
    return sortedPaydayPlans.slice(start, start + planPageSize);
  }, [sortedPaydayPlans, planPage, planPageSize]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
            {t("transactions.title") || "History"}
          </h1>
          <InfoTooltip
            title="About History & Payday Splits"
            content="A complete record of all your household income, expenses and pool transfers as well as your income splits."
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

              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

              <div className="w-full sm:w-56 text-xs">
                <PoolPicker
                  pools={[
                    { id: "ALL", name: "All Pools" },
                    ...pools.map((p) => ({
                      id: p.id,
                      name: p.name,
                      poolType: p.poolType,
                      currentBalance: p.currentBalance,
                      isPrivate: p.isPrivate ?? undefined,
                    })),
                  ]}
                  selectedPoolId={selectedPool || "ALL"}
                  allowCategorySelection={false}
                  placeholder="All Pools"
                  showBalance={false}
                  onChange={(sel) => setSelectedPool(sel.poolId || "ALL")}
                />
              </div>

              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

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
                    {tType === "ALL" ? "All" : tType === "DEBIT" ? "Spent" : tType === "CREDIT" ? "Received" : "Transfers"}
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
              <span>Export CSV</span>
            </button>
          </div>

          {(poolIdParam || categoryIdParam || bankAccountIdParam) && (
            <div className="flex items-center gap-3 flex-wrap">
              <RecordFilterBadge
                label={
                  poolIdParam
                    ? matchedPool
                      ? `Filtered to Pool: ${matchedPool.name}`
                      : "Filter: Item unavailable"
                    : categoryIdParam
                    ? matchedCategory
                      ? `Filtered to Category: ${matchedCategory.name}`
                      : "Filter: Item unavailable"
                    : matchedBankAccount
                    ? `Filtered to Account: ${matchedBankAccount.name}`
                    : "Filter: Item unavailable"
                }
                onClear={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("poolId");
                  url.searchParams.delete("id");
                  url.searchParams.delete("categoryId");
                  url.searchParams.delete("bankAccountId");
                  router.push(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
                }}
              />
              {isFilterParamInvalid && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                  Requested item was not found or is archived. Showing all records.
                </span>
              )}
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            {transactionsQuery.isLoading ? (
              <SkeletonTable cols={5} rows={pageSize} />
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
                        width={widths.type}
                        onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("type", e)}
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (sortColumn === "transactionType") setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setSortColumn("transactionType"); setSortDirection("asc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Transaction Type</span>
                          {sortColumn === "transactionType" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
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
                      <ResizableTh width={widths.category} onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("category", e)} className="py-3 px-4 text-left">
                        Pool
                      </ResizableTh>
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
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            tx.transactionType === "INCOME_SPLIT"
                              ? "bg-blue-50 text-[#2563eb] border border-blue-200/60"
                              : tx.transactionType?.includes("TRANSFER")
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                              : tx.transactionType === "ACCOUNT_ALIGNMENT"
                              ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                              : tx.transactionType === "OPENING_BALANCE"
                              ? "bg-slate-100 text-slate-700 border border-slate-200/60"
                              : "bg-slate-50 text-slate-600 border border-slate-200/60"
                          }`}>
                            {getTransactionTypeLabel(tx.transactionType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1B2B4B] text-left">
                          <span>{tx.description}</span>
                        </td>
                        <td className="py-3 px-4 text-left">
                          {tx.categoryName.includes(" ➔ ") ? (() => {
                            const [fromPart, toPart] = tx.categoryName.split(" ➔ ");
                            const cleanFrom = fromPart.replace(/\s*\([^)]*\)$/, "").trim();
                            const cleanTo = toPart.replace(/\s*\([^)]*\)$/, "").trim();
                            const fromPool = pools.find((p) => p.name.toLowerCase() === cleanFrom.toLowerCase());
                            const toPool = pools.find((p) => p.name.toLowerCase() === cleanTo.toLowerCase());
                            return (
                              <span className="font-semibold text-[#1B2B4B] flex items-center gap-1">
                                <Link
                                  href={fromPool ? `/dashboard/pools?poolId=${fromPool.id}` : `/dashboard/pools`}
                                  className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                                >
                                  <span>{fromPart}</span>
                                  <span className="text-[10px] text-blue-400">↗</span>
                                </Link>
                                <span className="text-zinc-400">➔</span>
                                <Link
                                  href={toPool ? `/dashboard/pools?poolId=${toPool.id}` : `/dashboard/pools`}
                                  className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                                >
                                  <span>{toPart}</span>
                                  <span className="text-[10px] text-blue-400">↗</span>
                                </Link>
                              </span>
                            );
                          })() : (
                            <Link
                              href={
                                tx.poolId
                                  ? `/dashboard/pools?poolId=${tx.poolId}`
                                  : tx.categoryId
                                  ? `/dashboard/pools?categoryId=${tx.categoryId}`
                                  : `/dashboard/pools`
                              }
                              className="font-semibold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>{tx.categoryName}</span>
                              <span className="text-[10px] text-blue-400">↗</span>
                            </Link>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                          tx.flowType === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {tx.flowType === "CREDIT" ? "+" : "-"}{fmt(tx.amount)}
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

              <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

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
                const headers = ["Income Split Date", "Income Date", "Income Source", "Receiving Bank Account", "Total Income Amount", "Pool/Category", "Allocated Amount", "Reasoning"];
                const rows: string[][] = [];

                for (const plan of paydayPlans) {
                  const splitDateStr = fmtDate(plan.createdAt);
                  const incDateStr = fmtDate(plan.expectedDate || plan.createdAt);
                  const incName = plan.incomeName || "Income Deposit";
                  const bankName = plan.receivingAccountName || "Main Account";
                  const totalAmt = plan.totalIncomeAmount;

                  for (const line of plan.lines) {
                    rows.push([
                      splitDateStr,
                      incDateStr,
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
                link.setAttribute("download", `money_matters_income_splits_${todayStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              disabled={sortedPaydayPlans.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <span>Export Allocations CSV</span>
            </button>
          </div>

          {bankAccountIdParam && (
            <div className="flex items-center gap-3 flex-wrap">
              <RecordFilterBadge
                label={matchedBankAccount ? `Filtered to Account: ${matchedBankAccount.name}` : "Filter: Item unavailable"}
                onClear={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("bankAccountId");
                  url.searchParams.delete("id");
                  router.push(url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
                }}
              />
              {Boolean(bankAccountIdParam && !matchedBankAccount) && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                  Requested item was not found or is archived. Showing all records.
                </span>
              )}
            </div>
          )}

          {/* Payday Allocations Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            {paydayPlansQuery.isLoading ? (
              <SkeletonTable cols={5} rows={planPageSize} />
            ) : sortedPaydayPlans.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 font-semibold">
                No income split plans found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-zinc-200/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      <ResizableTh
                        width={planWidths.splitDate}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("splitDate", e)}
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "createdAt") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("createdAt"); setPlanSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>INCOME SPLIT DATE</span>
                          {planSortColumn === "createdAt" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </ResizableTh>

                      <ResizableTh
                        width={planWidths.incomeDate}
                        onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("incomeDate", e)}
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                        onClick={() => {
                          if (planSortColumn === "expectedDate") setPlanSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                          else { setPlanSortColumn("expectedDate"); setPlanSortDirection("desc"); }
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>INCOME DATE</span>
                          {planSortColumn === "expectedDate" && <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>}
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
                          <span>Income</span>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {paginatedPaydayPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-zinc-500">
                          {fmtDate(plan.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-500">
                          {fmtDate(plan.expectedDate || plan.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <button
                            type="button"
                            onClick={() => setActivePlanForDrawer(plan)}
                            className="font-bold text-[#2563eb] hover:underline text-left"
                          >
                            {plan.incomeName || "Income Deposit"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-left font-semibold">
                          <Link
                            href={plan.receivingAccountId ? `/dashboard/bank-accounts?id=${plan.receivingAccountId}` : "/dashboard/bank-accounts"}
                            className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{plan.receivingAccountName || "Main Account"}</span>
                            <span className="text-[10px] text-blue-400">↗</span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#2563eb] tabular-nums">
                          {fmt(plan.totalIncomeAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {sortedPaydayPlans.length >= 5 && (
            <PaginationBar
              page={planPage}
              totalPages={planTotalPages}
              pageSize={planPageSize}
              totalItems={sortedPaydayPlans.length}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={setPlanPage}
              onPageSizeChange={(newSize) => {
                setPlanPageSize(newSize);
                setPlanPage(1);
              }}
            />
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
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
