"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../lib/trpc";
import { FilterBar } from "../../../components/web/FilterBar";
import { PaginationBar } from "@money-matters/ui/web";
import { IncomeExpenseFormModal } from "../../../components/web/IncomeExpenseFormModal";
import { SourceBurstDetailModal } from "../../../components/web/SourceBurstDetailModal";

function fmt(val: string | number) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatScheduleDetail(rrule?: string | null, startDate?: string | null) {
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);

  const fmtDate = (dStr?: string | null) => {
    if (!dStr) return null;
    try {
      const parts = dStr.split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {}
    return dStr;
  };

  const formattedDate = fmtDate(startDate);

  if (!isRecurring) {
    return {
      isRecurring: false,
      badgeText: "One-off",
      detailText: formattedDate ? `Expected ${formattedDate}` : "One-off schedule",
    };
  }

  let frequencyLabel = "Recurring";
  if (rrule?.includes("INTERVAL=2") && rrule?.includes("WEEKLY")) {
    frequencyLabel = "Fortnightly";
  } else if (rrule?.includes("FREQ=WEEKLY")) {
    frequencyLabel = "Weekly";
  } else if (rrule?.includes("FREQ=MONTHLY")) {
    frequencyLabel = "Monthly";
  } else if (rrule?.includes("FREQ=YEARLY") || rrule?.includes("ANNUALLY")) {
    frequencyLabel = "Annually";
  }

  return {
    isRecurring: true,
    badgeText: frequencyLabel,
    detailText: formattedDate ? `Kicks off ${formattedDate}` : frequencyLabel,
  };
}

export interface UnifiedSourceItem {
  id: string;
  type: "INCOME" | "EXPENSE";
  name: string;
  amount: string;
  rrule?: string | null;
  startDate?: string | null;
  categoryId?: string | null;
  receivingAccountId?: string | null;
  categoryName?: string;
  accountName?: string;
  isUpcoming: boolean;
}

export default function IncomeAndExpensesPage() {
  const utils = trpc.useUtils();
  const incomeSourcesQuery = trpc.listIncomeSources.useQuery();
  const expenseSourcesQuery = trpc.listExpenseSources.useQuery();
  const categoriesQuery = trpc.listCategories.useQuery();
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery();
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery();
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery();

  const incomeSources = incomeSourcesQuery.data ?? [];
  const expenseSources = expenseSourcesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const incomeEvents = incomeEventsQuery.data ?? [];
  const expenseEvents = expenseEventsQuery.data ?? [];

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");
  const [timelineFilter, setTimelineFilter] = useState("ALL");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sourceTypeFilter, timelineFilter, pageSize]);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [sourceToEdit, setSourceToEdit] = useState<React.ComponentProps<typeof IncomeExpenseFormModal>["sourceToEdit"]>(undefined);

  // Burst Detail Modal State
  const [burstModalOpen, setBurstModalOpen] = useState(false);
  const [burstModalMode, setBurstModalMode] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [burstSourceId, setBurstSourceId] = useState<string | null>(null);
  const [burstSourceName, setBurstSourceName] = useState("");
  const [burstSourceAmount, setBurstSourceAmount] = useState("");
  const [burstCategoryName, setBurstCategoryName] = useState("");

  // Mutations
  const archiveIncomeMut = trpc.archiveIncomeSource.useMutation({
    onSuccess: () => {
      utils.listIncomeSources.invalidate();
      utils.listIncomeEvents.invalidate();
    },
  });

  const archiveExpenseMut = trpc.archiveExpenseSource.useMutation({
    onSuccess: () => {
      utils.listExpenseSources.invalidate();
      utils.listExpenseEvents.invalidate();
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Combine Income Sources & Expense Bills into Unified List
  const unifiedList: UnifiedSourceItem[] = React.useMemo(() => {
    const list: UnifiedSourceItem[] = [];

    // Map Income Sources
    incomeSources.forEach((inc) => {
      const acc = bankAccounts.find((a) => a.id === inc.receivingAccountId);
      const hasUpcomingEvent = incomeEvents.some(
        (e) => e.incomeSourceId === inc.id && e.expectedDate >= todayStr
      );
      const isUpcoming = (inc.startDate ? inc.startDate >= todayStr : false) || hasUpcomingEvent || Boolean(inc.rrule);

      list.push({
        id: inc.id,
        type: "INCOME",
        name: inc.name,
        amount: inc.amount,
        rrule: inc.rrule,
        startDate: inc.startDate,
        receivingAccountId: inc.receivingAccountId,
        accountName: acc?.name || "Main Account",
        isUpcoming,
      });
    });

    // Map Expense Sources
    expenseSources.forEach((exp) => {
      const cat = categories.find((c) => c.id === exp.categoryId);
      const hasUpcomingEvent = expenseEvents.some(
        (e) => e.expenseSourceId === exp.id && e.expectedDate >= todayStr
      );
      const isUpcoming = (exp.startDate ? exp.startDate >= todayStr : false) || hasUpcomingEvent || Boolean(exp.rrule);

      list.push({
        id: exp.id,
        type: "EXPENSE",
        name: exp.name,
        amount: exp.amount,
        rrule: exp.rrule,
        startDate: exp.startDate,
        categoryId: exp.categoryId,
        categoryName: cat?.name || "Uncategorized",
        isUpcoming,
      });
    });

    return list;
  }, [incomeSources, expenseSources, categories, bankAccounts, incomeEvents, expenseEvents, todayStr]);

  // Filter Logic
  const filtered = React.useMemo(() => {
    return unifiedList.filter((item) => {
      // Type Filter
      if (sourceTypeFilter !== "ALL" && item.type !== sourceTypeFilter) return false;

      // Timeline Filter
      if (timelineFilter === "UPCOMING" && !item.isUpcoming) return false;

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCategory = item.categoryName?.toLowerCase().includes(q);
        const matchesAccount = item.accountName?.toLowerCase().includes(q);
        const matchesAmount = item.amount.includes(q);
        if (!matchesName && !matchesCategory && !matchesAccount && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedList, sourceTypeFilter, timelineFilter, searchQuery]);

  // Paginated Subset
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleArchive = async (item: UnifiedSourceItem) => {
    if (item.type === "INCOME") {
      if (confirm(`Archiving this income stream will cancel all future upcoming paydays. Proceed with archiving "${item.name}"?`)) {
        try {
          await archiveIncomeMut.mutateAsync({ id: item.id });
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Failed to archive income source.");
        }
      }
    } else {
      if (confirm(`Archiving this bill will cancel all future upcoming bill reminders. Proceed with archiving "${item.name}"?`)) {
        try {
          await archiveExpenseMut.mutateAsync({ id: item.id });
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Failed to archive expense bill.");
        }
      }
    }
  };

  const isLoading = incomeSourcesQuery.isLoading || expenseSourcesQuery.isLoading;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1B2B4B] tracking-tight">{t("common.incomeAndExpenses")}</h1>
          <p className="text-xs text-zinc-500 font-semibold mt-0.5">
            Configure recurring paychecks, bonuses, utility bills, and fixed obligations in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setModalMode("INCOME");
              setSourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <span>💰</span>
            <span>Add Income Source</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode("EXPENSE");
              setSourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#00B4A6] hover:opacity-90 transition-all shadow-md flex items-center gap-2"
          >
            <span>💸</span>
            <span>Add Expense Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Bar with Type & Timeline Groups */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search name, category, or account..."
        filterGroups={[
          {
            label: "Type",
            value: sourceTypeFilter,
            onChange: setSourceTypeFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: t("common.allSources") },
              { id: "INCOME", label: t("common.incomeSources") },
              { id: "EXPENSE", label: t("common.expenseBills") },
            ],
          },
          {
            label: "Timeline",
            value: timelineFilter,
            onChange: setTimelineFilter,
            defaultValue: "ALL",
            options: [
              { id: "ALL", label: "All" },
              { id: "UPCOMING", label: t("common.upcomingOnly") },
            ],
          },
        ]}
        onClearAll={() => {
          setSearchQuery("");
          setSourceTypeFilter("ALL");
          setTimelineFilter("ALL");
        }}
      />

      {/* Combined Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs font-semibold">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider select-none">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Schedule</th>
              <th className="px-6 py-4">{t("common.categoryOrAccount")}</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">
                  Loading income & expense sources...
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-400 font-medium">
                  No matching income or expense sources found.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const sched = formatScheduleDetail(item.rrule, item.startDate);
                const isIncome = item.type === "INCOME";

                return (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setBurstModalMode(item.type);
                          setBurstSourceId(item.id);
                          setBurstSourceName(item.name);
                          setBurstSourceAmount(item.amount);
                          setBurstCategoryName(item.categoryName || "");
                          setBurstModalOpen(true);
                        }}
                        className="text-[#00B4A6] hover:underline font-bold text-left cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{item.name}</span>
                        <span className="text-zinc-400 text-[10px]">🔗</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isIncome ? "Income (+)" : "Expense (-)"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`self-start px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            sched.isRecurring
                              ? isIncome
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-teal-50 text-[#00B4A6] border-teal-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {sched.badgeText}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium">{sched.detailText}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {isIncome ? (
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-400">🏦</span>
                          <span>{item.accountName || "Main Bank Account"}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-400">🏷️</span>
                          <span>{item.categoryName || "Uncategorized"}</span>
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 font-mono font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                      {isIncome ? "+" : "-"}{fmt(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModalMode(item.type);
                            setSourceToEdit({
                              id: item.id,
                              name: item.name,
                              amount: item.amount,
                              categoryId: item.categoryId,
                              receivingAccountId: item.receivingAccountId,
                              rrule: item.rrule,
                              startDate: item.startDate,
                            });
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filtered.length}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Income/Expense Modal */}
      <IncomeExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        sourceToEdit={sourceToEdit}
        onSuccess={() => {
          utils.listIncomeSources.invalidate();
          utils.listExpenseSources.invalidate();
          utils.listIncomeEvents.invalidate();
          utils.listExpenseEvents.invalidate();
        }}
      />

      {/* Burst Occurrences Modal */}
      <SourceBurstDetailModal
        isOpen={burstModalOpen}
        onClose={() => setBurstModalOpen(false)}
        mode={burstModalMode}
        sourceId={burstSourceId}
        sourceName={burstSourceName}
        sourceAmount={burstSourceAmount}
        categoryName={burstCategoryName}
      />
    </div>
  );
}
