"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ConfirmDialog, InfoTooltip } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { MarkPaidModal, ShortfallTransferItem } from "../income-and-bills/components/MarkPaidModal";
import { TransferModal } from "../../../components/web/TransferModal";
import { useLocale } from "../../../providers/LocaleProvider";

export interface WebAttentionItem {
  readonly id: string;
  readonly type: "EXPENSE" | "TRANSFER";
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId?: string | null;
  readonly categoryName?: string | null;
  readonly sourcePoolId?: string | null;
  readonly sourcePoolName?: string | null;
  readonly destinationPoolId?: string | null;
  readonly destinationPoolName?: string | null;
  readonly isOverdue: boolean;
  readonly categoryBalance?: number;
}

export interface CategoryOption {
  readonly id: string;
  readonly name: string;
  readonly poolType?: string;
  readonly currentBalance: number | string;
  readonly isSurplusTarget?: boolean;
  readonly bankAccountId?: string | null;
}

export interface WebAttentionItemsListProps {
  readonly items: readonly WebAttentionItem[];
  readonly availableCategories?: readonly CategoryOption[];
  readonly onMarkPaid: (item: WebAttentionItem, amount: number, date: string) => void;
  readonly onSkipExpense?: (item: WebAttentionItem) => void;
  readonly onSaveTransferDraft?: (params: {
    eventId: string;
    name: string;
    amount: string;
    expectedDate: string;
  }) => Promise<void>;
  readonly onExecuteTransfer?: (params: {
    eventId: string;
    name: string;
    amount: string;
    sourcePoolId?: string;
    destinationPoolId?: string;
  }) => Promise<void>;
  readonly onDeleteTransfer?: (eventId: string) => Promise<void>;
  readonly onConfirmTransferAndPay?: (
    transfers: ShortfallTransferItem[],
    destinationCategoryId: string
  ) => Promise<void>;
  readonly formatAUD?: (val: number | string) => string;
}

export const AttentionItemsList: React.FC<WebAttentionItemsListProps> = ({
  items,
  availableCategories = [],
  onMarkPaid,
  onSkipExpense,
  onSaveTransferDraft,
  onExecuteTransfer,
  onDeleteTransfer,
  onConfirmTransferAndPay,
  formatAUD,
}) => {
  const { fmt, fmtDate: formatLocaleDate, timezone: contextTz } = useLocale();
  const format = formatAUD ?? fmt;
  const [selectedMarkPaidItem, setSelectedMarkPaidItem] = useState<WebAttentionItem | null>(null);
  const [selectedTransferItem, setSelectedTransferItem] = useState<WebAttentionItem | null>(null);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState<WebAttentionItem | null>(null);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: contextTz || "Australia/Sydney" }).format(new Date());
  }, [contextTz]);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#1B2B4B]">
              {t("dashboard.upcomingExpensesTransfers.title", { defaultValue: "Upcoming Expenses & Transfers" })}
            </h2>
            <InfoTooltip
              title={t("dashboard.upcomingExpensesTransfers.title", { defaultValue: "Upcoming Expenses & Transfers" })}
              content={t("dashboard.upcomingExpensesTransfers.tooltip", {
                defaultValue: "Upcoming bill commitments and scheduled pool transfers.",
              })}
            />
          </div>
          <Link
            href="/dashboard/income-and-bills?tab=EVENTS"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {t("common.showMore", { defaultValue: "Show More →" })}
          </Link>
        </div>
        <p className="text-xs text-gray-400 py-4 text-center">
          {t("dashboard.upcomingExpensesTransfers.empty", {
            defaultValue: "No upcoming expenses or transfers scheduled.",
          })}
        </p>
      </div>
    );
  }

  // Sort: Overdue first, then upcoming by date
  const sortedItems = [...items]
    .sort((a, b) => {
      const aOverdue = a.isOverdue || a.expectedDate < todayStr;
      const bOverdue = b.isOverdue || b.expectedDate < todayStr;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
    })
    .slice(0, 3);

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-[#1B2B4B]">
            {t("dashboard.upcomingExpensesTransfers.title", { defaultValue: "Upcoming Expenses & Transfers" })} (
            {items.length})
          </h2>
          <InfoTooltip
            title={t("dashboard.upcomingExpensesTransfers.title", { defaultValue: "Upcoming Expenses & Transfers" })}
            content={t("dashboard.upcomingExpensesTransfers.tooltip", {
              defaultValue: "Upcoming bill commitments and scheduled pool transfers.",
            })}
          />
        </div>
        <Link
          href="/dashboard/income-and-bills?tab=EVENTS"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t("common.showMore", { defaultValue: "Show More →" })}
        </Link>
      </div>

      <div className="space-y-3">
        {sortedItems.map((item) => {
          const isOverdue = item.isOverdue || item.expectedDate < todayStr;
          const isTransfer = item.type === "TRANSFER";

          let daysAwayNode: React.ReactNode = "";
          if (item.expectedDate) {
            const itemDate = new Date(item.expectedDate);
            itemDate.setHours(0, 0, 0, 0);
            const todayZero = new Date();
            todayZero.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((itemDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
              daysAwayNode = t("dashboard.upcomingExpensesTransfers.dueToday", { defaultValue: "Due today!" });
            } else if (diffDays > 0) {
              daysAwayNode = t("dashboard.upcomingExpensesTransfers.daysAway", {
                count: diffDays,
                plural: diffDays === 1 ? "" : "s",
                defaultValue: `${diffDays} day${diffDays === 1 ? "" : "s"} away`,
              });
            } else {
              const count = Math.abs(diffDays);
              daysAwayNode = (
                <span>
                  {count} {count === 1 ? "day" : "days"}{" "}
                  <strong className="font-extrabold text-rose-600 dark:text-rose-400">overdue</strong>
                </span>
              );
            }
          }

          return (
            <div
              key={`${item.type}-${item.id}`}
              className={`border rounded-xl p-3 flex items-center justify-between gap-3 transition-colors ${
                isOverdue
                  ? "bg-rose-50/40 border-rose-200/60 hover:bg-rose-50/70"
                  : isTransfer
                  ? "bg-indigo-50/30 border-indigo-200/60 hover:bg-indigo-50/60"
                  : "bg-amber-50/30 border-amber-200/60 hover:bg-amber-50/60"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#1B2B4B] block truncate">{item.name}</span>
                  {!isOverdue && isTransfer && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-extrabold text-[9px] rounded uppercase tracking-wider border border-indigo-200">
                      {t("common.transfer", { defaultValue: "Transfer" })}
                    </span>
                  )}
                  {!isOverdue && !isTransfer && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[9px] rounded uppercase tracking-wider border border-amber-200">
                      {t("common.dueSoon", { defaultValue: "Due Soon" })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 font-mono">
                  <span className="font-semibold text-gray-900 tabular-nums">{format(item.expectedAmount)}</span> ·{" "}
                  {daysAwayNode} ({formatLocaleDate(item.expectedDate)})
                  {isTransfer && item.sourcePoolName && item.destinationPoolName && (
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
                      {item.sourcePoolName} ➔ {item.destinationPoolName}
                    </span>
                  )}
                  {!isTransfer && item.categoryName && (
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
                      {item.categoryName}
                      {typeof item.categoryBalance === "number" &&
                        ` ${t("dashboard.upcomingExpensesTransfers.availableSuffix", {
                          amount: format(item.categoryBalance),
                          defaultValue: `· ${format(item.categoryBalance)} available`,
                        })}`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isTransfer ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedMarkPaidItem(item)}
                      className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                    >
                      {t("common.markSpent", { defaultValue: "Mark Spent" })}
                    </button>
                    {onSkipExpense && (
                      <button
                        type="button"
                        onClick={() => setSelectedDeleteItem(item)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:underline cursor-pointer transition-colors px-1.5 py-1"
                      >
                        {t("common.delete", { defaultValue: "Delete" })}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTransferItem(item)}
                      className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                    >
                      {t("common.transfer", { defaultValue: "Transfer" })}
                    </button>
                    {onDeleteTransfer && (
                      <button
                        type="button"
                        onClick={() => setSelectedDeleteItem(item)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:underline cursor-pointer transition-colors px-1.5 py-1"
                      >
                        {t("common.delete", { defaultValue: "Delete" })}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedMarkPaidItem && (
        <MarkPaidModal
          isOpen={Boolean(selectedMarkPaidItem)}
          onClose={() => setSelectedMarkPaidItem(null)}
          billName={selectedMarkPaidItem.name}
          poolId={selectedMarkPaidItem.categoryId || availableCategories[0]?.id}
          initialAmount={selectedMarkPaidItem.expectedAmount}
          initialDate={selectedMarkPaidItem.expectedDate}
          availableCategories={availableCategories as CategoryOption[]}
          onConfirmMarkPaid={async ({ amount, date, transfers }) => {
            const destId = selectedMarkPaidItem.categoryId || availableCategories[0]?.id || "";
            if (transfers && transfers.length > 0 && onConfirmTransferAndPay) {
              await onConfirmTransferAndPay(transfers, destId);
            }
            onMarkPaid(selectedMarkPaidItem, amount, date);
            setSelectedMarkPaidItem(null);
          }}
          onOpenTransferModal={() => {
            const item = selectedMarkPaidItem;
            setSelectedMarkPaidItem(null);
            if (item) {
              setSelectedTransferItem({
                id: `transfer_${Date.now()}`,
                type: "TRANSFER",
                name: "Transfer between Pools",
                expectedAmount: 0,
                expectedDate: todayStr,
                destinationPoolId: item.categoryId,
                isOverdue: false,
              });
            }
          }}
        />
      )}

      {selectedTransferItem && (
        <TransferModal
          isOpen={Boolean(selectedTransferItem)}
          onClose={() => setSelectedTransferItem(null)}
          transfer={{
            id: selectedTransferItem.id,
            name: selectedTransferItem.name,
            expectedAmount: selectedTransferItem.expectedAmount,
            expectedDate: selectedTransferItem.expectedDate,
            sourcePoolId: selectedTransferItem.sourcePoolId,
            sourcePoolName: selectedTransferItem.sourcePoolName,
            destinationPoolId: selectedTransferItem.destinationPoolId,
            destinationPoolName: selectedTransferItem.destinationPoolName,
          }}
          pools={availableCategories}
          onSaveDraft={async (params) => {
            if (onSaveTransferDraft) {
              await onSaveTransferDraft(params);
            }
            setSelectedTransferItem(null);
          }}
          onConfirmTransfer={async (params) => {
            if (onExecuteTransfer) {
              await onExecuteTransfer(params);
            }
            setSelectedTransferItem(null);
          }}
          onDeleteTransfer={async (eventId) => {
            if (onDeleteTransfer) {
              await onDeleteTransfer(eventId);
            }
            setSelectedTransferItem(null);
          }}
          formatAUD={format}
        />
      )}

      {selectedDeleteItem && (
        <ConfirmDialog
          isOpen={Boolean(selectedDeleteItem)}
          onClose={() => setSelectedDeleteItem(null)}
          onConfirm={() => {
            if (selectedDeleteItem.type === "EXPENSE" && onSkipExpense) {
              onSkipExpense(selectedDeleteItem);
            } else if (selectedDeleteItem.type === "TRANSFER" && onDeleteTransfer) {
              onDeleteTransfer(selectedDeleteItem.id);
            }
            setSelectedDeleteItem(null);
          }}
          title={
            selectedDeleteItem.type === "EXPENSE"
              ? t("common.deleteExpenseTitle", { defaultValue: "Delete Expense" })
              : t("modals.transfer.deleteConfirmTitle", { defaultValue: "Delete Transfer" })
          }
          description={
            selectedDeleteItem.type === "EXPENSE"
              ? t("common.deleteExpensePrompt", {
                  name: selectedDeleteItem.name,
                  defaultValue: `Are you sure you want to delete "${selectedDeleteItem.name}"?`,
                })
              : t("modals.transfer.deletePrompt", {
                  defaultValue: "Are you sure you want to delete this scheduled transfer? This action cannot be undone.",
                })
          }
          confirmLabel={t("common.delete", { defaultValue: "Delete" })}
          cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
          variant="danger"
        />
      )}
    </div>
  );
};

export default AttentionItemsList;
