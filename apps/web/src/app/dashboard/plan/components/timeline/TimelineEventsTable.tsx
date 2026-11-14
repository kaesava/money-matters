import React from "react";
import Link from "next/link";
import { PaginationBar, SkeletonTable, ResizableTh } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { useLocale } from "../../../../../providers/LocaleProvider";
import { TimelineEventItem } from "./types";

interface TimelineEventsTableProps {
  isLoading: boolean;
  filteredTimeline: TimelineEventItem[];
  paginatedEvents: TimelineEventItem[];
  widths: {
    date: number;
    name: number;
    poolAccount: number;
    amount: number;
    actions: number;
  };
  onMouseDown: (column: "date" | "name" | "poolAccount" | "amount" | "actions", e: React.MouseEvent) => void;
  sortField: "date" | "name" | "amount";
  sortOrder: "asc" | "desc";
  onSort: (field: "date" | "name" | "amount") => void;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
  todayStr: string;
  savedIncomeEventIds?: Set<string>;
  onEventNameClick: (evt: TimelineEventItem) => void;
  onExpenseMarkPaidClick: (evt: TimelineEventItem) => void;
  onTransferClick: (evt: TimelineEventItem) => void;
  onAllocateIncome: (eventId: string) => void;
  onRequestDelete: (target: { id: string; kind: "INCOME" | "EXPENSE" | "TRANSFER" }) => void;
}

export function TimelineEventsTable({
  isLoading,
  filteredTimeline,
  paginatedEvents,
  widths,
  onMouseDown,
  sortField,
  sortOrder,
  onSort,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  todayStr,
  savedIncomeEventIds,
  onEventNameClick,
  onExpenseMarkPaidClick,
  onTransferClick,
  onAllocateIncome,
  onRequestDelete,
}: TimelineEventsTableProps) {
  const { fmt, fmtDate: formatLocaleDate } = useLocale();

  if (isLoading) {
    return <SkeletonTable rows={5} cols={4} />;
  }

  if (filteredTimeline.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-zinc-500">
          {t("planTabs.noUpcomingEventsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">
              <ResizableTh
                width={widths.date}
                onResizeMouseDown={(e) => onMouseDown("date", e)}
                className="py-3 px-4 text-center"
              >
                <button
                  type="button"
                  onClick={() => onSort("date")}
                  className="flex items-center justify-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold w-full"
                >
                  <span>{t("tables.date")}</span>
                  {sortField === "date" && (
                    <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </ResizableTh>

              <ResizableTh
                width={widths.name}
                onResizeMouseDown={(e) => onMouseDown("name", e)}
                className="py-3 px-4 text-left"
              >
                <button
                  type="button"
                  onClick={() => onSort("name")}
                  className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold"
                >
                  <span>{t("tables.name")}</span>
                  {sortField === "name" && (
                    <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </ResizableTh>

              <ResizableTh
                width={widths.poolAccount}
                onResizeMouseDown={(e) => onMouseDown("poolAccount", e)}
                className="py-3 px-4 text-left"
              >
                <span>{t("tables.envelopeOrBankAccount")}</span>
              </ResizableTh>

              <ResizableTh
                width={widths.amount}
                onResizeMouseDown={(e) => onMouseDown("amount", e)}
                className="py-3 px-4 text-right"
              >
                <button
                  type="button"
                  onClick={() => onSort("amount")}
                  className="flex items-center gap-1 justify-end hover:text-zinc-700 dark:hover:text-zinc-200 font-bold w-full"
                >
                  <span>{t("tables.amount")}</span>
                  {sortField === "amount" && (
                    <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </ResizableTh>

              <ResizableTh
                width={widths.actions}
                onResizeMouseDown={(e) => onMouseDown("actions", e)}
                className="py-3 px-4 text-center"
              >
                <span>{t("tables.actions")}</span>
              </ResizableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {paginatedEvents.map((evt) => {
              const isIncome = evt.eventKind === "INCOME";
              const isTransfer = evt.eventKind === "TRANSFER";
              const isPast = evt.expectedDate < todayStr;
              const formattedDate = formatLocaleDate(evt.expectedDate);

              return (
                <tr
                  key={`${evt.eventKind}_${evt.id}`}
                  className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {/* Date Column */}
                  <td className="py-3 px-4 text-center font-mono font-medium">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span
                        className={
                          isPast
                            ? "text-red-600 dark:text-red-400 font-bold"
                            : "text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {formattedDate}
                      </span>
                      {isPast && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                          {t("expenseStatus.overdueLabel")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Name Column */}
                  <td className="py-3 px-4 text-left">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onEventNameClick(evt)}
                          className="font-bold text-[#2563eb] hover:underline cursor-pointer text-left focus:outline-none"
                        >
                          {evt.name ||
                            (isIncome
                              ? "Income Deposit"
                              : isTransfer
                              ? "Pool Transfer"
                              : "Scheduled Expense")}
                        </button>
                        {isIncome && savedIncomeEventIds?.has(evt.id) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            title={t("paydayDrawer.lockedBadgeTooltip")}
                          >
                            <span className="text-[9px]">🔒</span>
                            {t("paydayDrawer.lockedBadge")}
                          </span>
                        )}
                      </div>
                      {evt.note && (
                        <span className="text-[11px] text-zinc-400 italic">
                          {evt.note}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* POOL / BANK ACCOUNT Column */}
                  <td className="py-3 px-4 text-left text-xs">
                    {isTransfer ? (
                      <div className="flex items-center gap-1 font-semibold text-xs">
                        <Link
                          href={`/dashboard/envelopes?poolId=${evt.poolId}`}
                          className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{evt.categoryName || "Source"}</span>
                          <span className="text-[10px] text-blue-400">↗</span>
                        </Link>
                        <span className="text-zinc-400">➔</span>
                        <Link
                          href={`/dashboard/envelopes?poolId=${evt.destinationPoolId}`}
                          className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{evt.destinationPoolName || "Destination"}</span>
                          <span className="text-[10px] text-blue-400">↗</span>
                        </Link>
                      </div>
                    ) : isIncome ? (
                      evt.accountId ? (
                        <Link
                          href={`/dashboard/envelopes?id=${evt.accountId}`}
                          className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{evt.accountName || "Bank Account"}</span>
                          <span className="text-[10px] text-blue-400">↗</span>
                        </Link>
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                          {evt.accountName || "Bank Account"}
                        </span>
                      )
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {evt.poolId || evt.categoryId ? (
                          <Link
                            href={`/dashboard/envelopes?poolId=${evt.poolId || evt.categoryId}`}
                            className="font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{evt.categoryName || "Envelope"}</span>
                            <span className="text-[10px] text-blue-400">↗</span>
                          </Link>
                        ) : (
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {evt.categoryName || "—"}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Amount Column */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums">
                    <span
                      className={
                        isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isTransfer
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {isIncome ? "+" : isTransfer ? "↔" : "-"}
                      {fmt(parseFloat(evt.expectedAmount || "0"))}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      {isIncome ? (
                        <div className="flex flex-row items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAllocateIncome(evt.id)}
                            className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-1.5 py-0.5"
                            title={t("dashboard.nextPay.reviewSplits")}
                          >
                            {t("common.runSplit")}
                          </button>
                        </div>
                      ) : isTransfer ? (
                        <button
                          type="button"
                          onClick={() => onTransferClick(evt)}
                          className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                        >
                          {t("common.transfer")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onExpenseMarkPaidClick(evt)}
                          className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                        >
                          {t("common.markSpent")}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onRequestDelete({
                            id: evt.id,
                            kind: isIncome ? "INCOME" : isTransfer ? "TRANSFER" : "EXPENSE",
                          })
                        }
                        className="text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title={isIncome ? t("common.deleteIncomeTitle") : t("common.deleteExpenseTitle")}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Conditional Pagination Bar (if 5+ total records) */}
      {filteredTimeline.length >= 5 && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTimeline.length}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
