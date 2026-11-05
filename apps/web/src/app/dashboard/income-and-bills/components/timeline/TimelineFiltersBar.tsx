import React from "react";
import { SearchInput } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";

interface TimelineFiltersBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: "ALL" | "OVERDUE";
  onStatusFilterChange: (val: "ALL" | "OVERDUE") => void;
  scopeFilter: "ALL" | "SHARED" | "PRIVATE";
  onScopeFilterChange: (val: "ALL" | "SHARED" | "PRIVATE") => void;
  kindFilter: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  onKindFilterChange: (val: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER") => void;
  autoFocus?: boolean;
}

export function TimelineFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  scopeFilter,
  onScopeFilterChange,
  kindFilter,
  onKindFilterChange,
  autoFocus = false,
}: TimelineFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
      <div className="flex-1 w-full max-w-full">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search events, pools, accounts, amount..."
          autoFocus={autoFocus}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Pills: All | Overdue */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onStatusFilterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onStatusFilterChange("OVERDUE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === "OVERDUE"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("expenseStatus.overdueLabel")}
          </button>
        </div>

        {/* Scope Filter Pills: All | Shared | Private */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onScopeFilterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              scopeFilter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.all")}
          </button>
          <button
            type="button"
            onClick={() => onScopeFilterChange("SHARED")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              scopeFilter === "SHARED"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.shared")}
          </button>
          <button
            type="button"
            onClick={() => onScopeFilterChange("PRIVATE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              scopeFilter === "PRIVATE"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.private")}
          </button>
        </div>

        {/* Kind Filter Pills: All | Income | Expense | Transfer */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onKindFilterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-[#1B2B4B] dark:text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.all")}
          </button>
          <button
            type="button"
            onClick={() => onKindFilterChange("INCOME")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "INCOME"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.income")}
          </button>
          <button
            type="button"
            onClick={() => onKindFilterChange("EXPENSE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "EXPENSE"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("common.expense")}
          </button>
          <button
            type="button"
            onClick={() => onKindFilterChange("TRANSFER")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              kindFilter === "TRANSFER"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t("incomeBillsTabs.transferTab")}
          </button>
        </div>
      </div>
    </div>
  );
}
