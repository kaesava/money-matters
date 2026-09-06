"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { fmtDate, Button, ConfirmDialog } from "@money-matters/ui/web";
import { useIconVisibility } from '@money-matters/ui';
import { MarkPaidModal, ShortfallTransferItem } from '../income-and-bills/components/MarkPaidModal';

export interface WebAttentionItem {
  readonly id: string;
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId: string | null;
  readonly categoryName?: string | null;
  readonly isOverdue: boolean;
  readonly categoryBalance: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  poolType?: string;
  currentBalance: number | string;
  isSurplusTarget?: boolean;
}

export interface WebAttentionItemsListProps {
  readonly items: readonly WebAttentionItem[];
  readonly availableCategories?: CategoryOption[];
  readonly onMarkPaid: (item: WebAttentionItem, amount: number, date: string) => void;
  readonly onSkip?: (item: WebAttentionItem) => void;
  readonly onConfirmTransferAndPay?: (transfers: ShortfallTransferItem[], destinationCategoryId: string) => Promise<void>;
  readonly formatAUD: (val: number | string) => string;
  readonly markingPaidId?: string | null;
  readonly onNavigateCategory?: (categoryName: string) => void;
}

export const AttentionItemsList: React.FC<WebAttentionItemsListProps> = ({
  items,
  availableCategories = [],
  onMarkPaid,
  onSkip,
  onConfirmTransferAndPay,
  formatAUD,
  onNavigateCategory,
}) => {
  const [selectedMarkPaidItem, setSelectedMarkPaidItem] = useState<WebAttentionItem | null>(null);
  const [selectedDeleteItem, setSelectedDeleteItem] = useState<WebAttentionItem | null>(null);
  const { showIcons } = useIconVisibility();

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {showIcons && <span className="text-lg">⚠️</span>}
            <h2 className="text-sm font-extrabold text-[#1B2B4B]">
              Upcoming Expenses
            </h2>
          </div>
          <Link
            href="/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Show More →
          </Link>
        </div>
        <p className="text-xs text-zinc-400 py-4 text-center">No upcoming bills scheduled.</p>
      </div>
    );
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

  // Sort: Overdue first, then upcoming by date
  const sortedItems = [...items].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
  }).slice(0, 3);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 mb-6 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {showIcons && <span className="text-lg">⚠️</span>}
          <h2 className="text-sm font-extrabold text-[#1B2B4B]">
            Upcoming Expenses ({items.length})
          </h2>
        </div>
        <Link
          href="/dashboard/income-and-bills?tab=EVENTS&type=EXPENSE"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Show More →
        </Link>
      </div>

      <div className="divide-y divide-zinc-100">
        {sortedItems.map((item) => {
          const isOverdue = item.isOverdue || item.expectedDate < todayStr;

          return (
            <div
              key={item.id}
              className={`py-3 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-1 border-l-4 transition-all ${
                isOverdue
                  ? "border-l-rose-600 bg-rose-50/40"
                  : "border-l-amber-500 bg-amber-50/30"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {showIcons && (
                    <span className="text-xs">{isOverdue ? '🔴' : '🟡'}</span>
                  )}
                  <span className="text-sm font-bold text-[#1B2B4B]">{item.name}</span>
                  {item.categoryName && (
                    <button
                      type="button"
                      onClick={() => onNavigateCategory?.(item.categoryName!)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {formatAUD(item.categoryBalance)} available
                    </button>
                  )}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isOverdue
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isOverdue ? "Overdue" : "Due Soon"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${isOverdue ? "text-rose-700 font-bold" : "text-zinc-500"}`}>
                    Due: {fmtDate(item.expectedDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-[#1B2B4B] font-mono tabular-nums">
                  {formatAUD(item.expectedAmount)}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setSelectedMarkPaidItem(item)}
                    className="px-3 py-1.5 text-xs font-bold"
                  >
                    Mark Paid
                  </Button>
                  {onSkip && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedDeleteItem(item)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 border-rose-200"
                    >
                      Delete
                    </Button>
                  )}
                </div>
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
          availableCategories={availableCategories}
          onConfirmMarkPaid={async ({ amount, date, transfers }) => {
            const destId = selectedMarkPaidItem.categoryId || availableCategories[0]?.id || "";
            if (transfers && transfers.length > 0 && onConfirmTransferAndPay) {
              await onConfirmTransferAndPay(transfers, destId);
            }
            onMarkPaid(selectedMarkPaidItem, amount, date);
            setSelectedMarkPaidItem(null);
          }}
        />
      )}

      {selectedDeleteItem && (
        <ConfirmDialog
          isOpen={Boolean(selectedDeleteItem)}
          onClose={() => setSelectedDeleteItem(null)}
          onConfirm={() => {
            if (selectedDeleteItem && onSkip) {
              onSkip(selectedDeleteItem);
            }
            setSelectedDeleteItem(null);
          }}
          title="Delete Expense"
          description={`Are you sure you want to Delete "${selectedDeleteItem.name}"?`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </div>
  );
};

export default AttentionItemsList;
