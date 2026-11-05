import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  SearchInput,
  PaginationBar,
  ResizableTh,
  SkeletonTable,
  RecordFilterBadge,
  SpendingOverviewCard,
} from "@money-matters/ui/web";
import { SlideOverAllocationDrawer } from "../../../../components/web/SlideOverAllocationDrawer";
import { useHistoryPaydayData } from "../hooks/useHistoryPaydayData";

interface PaydayAllocationsTabProps {
  bankAccounts: Array<{ id: string; name: string }>;
  bankAccountIdParam?: string;
  isActive: boolean;
}

export function PaydayAllocationsTab({
  bankAccounts,
  bankAccountIdParam = "",
  isActive,
}: PaydayAllocationsTabProps) {
  const router = useRouter();

  const {
    planSearchQuery,
    setPlanSearchQuery,
    planTimeframe,
    setPlanTimeframe,
    selectedBankFilter,
    setSelectedBankFilter,
    planSortColumn,
    planSortDirection,
    handlePlanSort,
    planPage,
    setPlanPage,
    planPageSize,
    setPlanPageSize,
    activePlanForDrawer,
    setActivePlanForDrawer,
    planWidths,
    onPlanMouseDown,
    paydayPlansQuery,
    incomeSplitAnalyticsQuery,
    uniqueBankAccounts,
    matchedBankAccount,
    incomeSplitLabels,
    sortedPaydayPlans,
    paginatedPaydayPlans,
    planTotalPages,
    handleExportAuditCSV,
    fmt,
    fmtDate,
  } = useHistoryPaydayData({
    bankAccounts,
    bankAccountIdParam,
    isActive,
  });

  return (
    <div className="space-y-6">
      {/* Income Splits Reporting Visualizations */}
      <SpendingOverviewCard
        analytics={incomeSplitAnalyticsQuery.data}
        isLoading={incomeSplitAnalyticsQuery.isLoading}
        timeframe={planTimeframe}
        onTimeframeChange={setPlanTimeframe}
        formatCurrency={(amt) => fmt(amt)}
        labels={incomeSplitLabels}
        showPayeesWhenFiltered={false}
      />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 border border-zinc-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
          <SearchInput
            value={planSearchQuery}
            onChange={setPlanSearchQuery}
            placeholder={t("transactions.searchPaydaysPlaceholder")}
          />

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <select
            value={selectedBankFilter}
            onChange={(e) => setSelectedBankFilter(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-700"
          >
            <option value="ALL">{t("transactions.allBanks")}</option>
            {uniqueBankAccounts.map((bName) => (
              <option key={bName} value={bName}>
                {bName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportAuditCSV}
          disabled={sortedPaydayPlans.length === 0}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          <span>{t("transactions.exportAuditCSV")}</span>
        </button>
      </div>

      {bankAccountIdParam && (
        <div className="flex items-center gap-3 flex-wrap">
          <RecordFilterBadge
            label={
              matchedBankAccount
                ? `Filtered to Account: ${matchedBankAccount.name}`
                : "Filter: Item unavailable"
            }
            onClear={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete("bankAccountId");
              url.searchParams.delete("id");
              router.push(
                url.pathname +
                  (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "")
              );
            }}
          />
          {Boolean(bankAccountIdParam && !matchedBankAccount) && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
              {t("bankAccounts.itemNotFoundOrArchived")}
            </span>
          )}
        </div>
      )}

      {/* Payday Allocations Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {paydayPlansQuery.isLoading ? (
          <SkeletonTable cols={6} rows={planPageSize} />
        ) : sortedPaydayPlans.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 font-semibold">
            {t("transactions.noPaydaysFound")}
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
                    onClick={() => handlePlanSort("createdAt")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t("tables.incomeSplitDateUpper")}</span>
                      {planSortColumn === "createdAt" && (
                        <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    width={planWidths.incomeDate}
                    onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("incomeDate", e)}
                    className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                    onClick={() => handlePlanSort("expectedDate")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t("tables.incomeDateUpper")}</span>
                      {planSortColumn === "expectedDate" && (
                        <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    width={planWidths.incomeName}
                    onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("incomeName", e)}
                    className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                    onClick={() => handlePlanSort("incomeName")}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t("transactions.typeCredit")}</span>
                      {planSortColumn === "incomeName" && (
                        <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    width={planWidths.receivingAccount}
                    onResizeMouseDown={(e: React.MouseEvent) =>
                      onPlanMouseDown("receivingAccount", e)
                    }
                    className="py-3 px-4 text-left cursor-pointer hover:bg-slate-100"
                    onClick={() => handlePlanSort("receivingAccount")}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t("tables.bankAccount")}</span>
                      {planSortColumn === "receivingAccount" && (
                        <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>

                  <ResizableTh
                    width={planWidths.amount}
                    onResizeMouseDown={(e: React.MouseEvent) => onPlanMouseDown("amount", e)}
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handlePlanSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t("tables.totalAmount")}</span>
                      {planSortColumn === "amount" && (
                        <span>{planSortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </ResizableTh>

                  <th className="py-3 px-4 text-center font-bold text-zinc-400 uppercase tracking-wider text-[11px] w-24">
                    <span>{t("tables.details")}</span>
                  </th>
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
                    <td className="py-3 px-4 text-left font-semibold text-[#1B2B4B] dark:text-white">
                      <span>{plan.incomeName || "Income Deposit"}</span>
                    </td>
                    <td className="py-3 px-4 text-left font-semibold">
                      <Link
                        href={
                          plan.receivingAccountId
                            ? `/dashboard/bank-accounts?id=${plan.receivingAccountId}`
                            : "/dashboard/bank-accounts"
                        }
                        className="text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{plan.receivingAccountName || "Main Account"}</span>
                        <span className="text-[10px] text-blue-400">↗</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{fmt(plan.totalIncomeAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setActivePlanForDrawer(plan)}
                        className="font-bold text-[#2563eb] hover:underline inline-flex items-center text-xs cursor-pointer"
                      >
                        <span>{t("tables.details")}</span>
                      </button>
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
        isOpen={Boolean(activePlanForDrawer)}
        onClose={() => setActivePlanForDrawer(null)}
        plan={activePlanForDrawer}
      />
    </div>
  );
}
