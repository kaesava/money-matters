import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  SearchInput,
  PaginationBar,
  ResizableTh,
  SkeletonTable,
  PoolPicker,
  RecordFilterBadge,
  SpendingOverviewCard,
} from "@money-matters/ui/web";
import {
  useHistoryTransactionsData,
  getTransactionTypeLabel,
} from "../hooks/useHistoryTransactionsData";

interface TransactionsTabProps {
  pools: Array<{
    id: string;
    name: string;
    envelopeType?: string;
    currentBalance: string | number;
    isPrivate?: boolean | null;
  }>;
  bankAccounts: Array<{ id: string; name: string }>;
  poolIdParam?: string;
  categoryIdParam?: string;
  bankAccountIdParam?: string;
  initialSearch?: string;
  isActive: boolean;
}

export function TransactionsTab({
  pools,
  bankAccounts,
  poolIdParam = "",
  categoryIdParam = "",
  bankAccountIdParam = "",
  initialSearch = "",
  isActive,
}: TransactionsTabProps) {
  const router = useRouter();

  const {
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    selectedPool,
    setSelectedPool,
    sortColumn,
    sortDirection,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    timeframe,
    setTimeframe,
    widths,
    onMouseDown,
    spendingAnalyticsQuery,
    transactionsQuery,
    matchedPool,
    matchedBankAccount,
    isFilterParamInvalid,
    sortedTransactions,
    paginatedTransactions,
    totalPages,
    handleExportCSV,
    fmt,
  } = useHistoryTransactionsData({
    pools,
    bankAccounts,
    poolIdParam,
    bankAccountIdParam,
    initialSearch,
    isActive,
  });

  return (
    <div data-tour="history-ledger" className="space-y-6">
      {/* Spending Overview Reporting Visualizations */}
      <SpendingOverviewCard
        analytics={spendingAnalyticsQuery.data}
        isLoading={spendingAnalyticsQuery.isLoading}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        formatCurrency={(amt) => fmt(amt)}
      />

      {/* Controls Bar & Segmented Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("transactions.searchPlaceholder")}
          />

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <div className="w-full sm:w-56 text-xs">
            <PoolPicker
              pools={pools.map((p) => ({
                id: p.id,
                name: p.name,
                poolType: p.envelopeType,
                currentBalance: p.currentBalance,
                isPrivate: p.isPrivate ?? undefined,
              }))}
              allowAllOption={true}
              selectedPoolId={selectedPool || "ALL"}
              allowCategorySelection={false}
              placeholder={t("common.allPools")}
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
                {tType === "ALL"
                  ? t("transactions.filterAll")
                  : tType === "DEBIT"
                  ? t("transactions.filterDebit")
                  : tType === "CREDIT"
                  ? t("transactions.filterCredit")
                  : t("transactions.filterTransfer")}
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
          <span>{t("transactions.csvExport")}</span>
        </button>
      </div>

      {(poolIdParam || categoryIdParam || bankAccountIdParam) && (
        <div className="flex items-center gap-3 flex-wrap">
          <RecordFilterBadge
            label={
              poolIdParam || categoryIdParam
                ? matchedPool
                  ? `Filtered to Envelope: ${matchedPool.name}`
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
              router.push(
                url.pathname +
                  (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "")
              );
            }}
          />
          {isFilterParamInvalid && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
              {t("bankAccounts.itemNotFoundOrArchived")}
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
            {t("transactions.noTransactionsFound")}
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
                    onClick={() => handleSort("recordedAt")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t("transactions.date")}</span>
                      {sortColumn === "recordedAt" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>
                  <ResizableTh
                    width={widths.type}
                    onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("type", e)}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("transactionType")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t("transactions.type")}</span>
                      {sortColumn === "transactionType" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>
                  <ResizableTh
                    width={widths.description}
                    onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("description", e)}
                    className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t("transactions.description")}</span>
                      {sortColumn === "description" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>
                  <ResizableTh
                    width={widths.category}
                    onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("category", e)}
                    className="py-3 px-4 text-left"
                  >
                    <span>{t("tables.envelopeOrBankAccount")}</span>
                  </ResizableTh>
                  <ResizableTh
                    width={widths.amount}
                    onResizeMouseDown={(e: React.MouseEvent) => onMouseDown("amount", e)}
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t("transactions.amount")}</span>
                      {sortColumn === "amount" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500 text-center">{tx.date}</td>
                    <td className="py-3 px-4 text-center text-zinc-600 dark:text-zinc-300 font-medium">
                      {getTransactionTypeLabel(tx.transactionType)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1B2B4B] text-left">
                      <span>{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      {tx.categoryName.includes(" ➔ ") ? (
                        (() => {
                          const [fromPart, toPart] = tx.categoryName.split(" ➔ ");
                          const cleanFrom = fromPart.replace(/\s*\([^)]*\)$/, "").trim();
                          const cleanTo = toPart.replace(/\s*\([^)]*\)$/, "").trim();
                          const fromPool = pools.find(
                            (p) => p.name.toLowerCase() === cleanFrom.toLowerCase()
                          );
                          const toPool = pools.find(
                            (p) => p.name.toLowerCase() === cleanTo.toLowerCase()
                          );
                          return (
                            <span className="font-semibold text-[#1B2B4B] flex items-center gap-1">
                              <Link
                                href={
                                  fromPool
                                    ? `/dashboard/envelopes?poolId=${fromPool.id}`
                                    : `/dashboard/envelopes`
                                }
                                className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>{fromPart}</span>
                                <span className="text-[10px] text-blue-400">↗</span>
                              </Link>
                              <span className="text-zinc-400">➔</span>
                              <Link
                                href={
                                  toPool
                                    ? `/dashboard/envelopes?poolId=${toPool.id}`
                                    : `/dashboard/envelopes`
                                }
                                className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>{toPart}</span>
                                <span className="text-[10px] text-blue-400">↗</span>
                              </Link>
                            </span>
                          );
                        })()
                      ) : (
                        <Link
                          href={
                            tx.poolId
                              ? `/dashboard/envelopes?poolId=${tx.poolId}`
                              : `/dashboard/envelopes`
                          }
                          className="font-semibold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{tx.categoryName}</span>
                          <span className="text-[10px] text-blue-400">↗</span>
                        </Link>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                        tx.flowType === "CREDIT"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.flowType === "CREDIT" ? "+" : "-"}
                      {fmt(tx.amount)}
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
  );
}
