'use client';

import React from 'react';

export interface WebAttentionItem {
  readonly id: string;
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId: string | null;
  readonly isOverdue: boolean;
  readonly categoryBalance: number;
}

export interface WebAttentionItemsListProps {
  readonly items: readonly WebAttentionItem[];
  readonly onMarkPaid: (item: WebAttentionItem) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const AttentionItemsList: React.FC<WebAttentionItemsListProps> = ({
  items,
  onMarkPaid,
  formatAUD,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-600 font-bold">⚠️</span>
        <h2 className="text-sm font-bold text-red-900">Needs Attention ({items.length})</h2>
      </div>

      <div className="divide-y divide-red-100">
        {items.map((item) => {
          const shortfall = item.expectedAmount - item.categoryBalance;
          const isFunded = shortfall <= 0;

          return (
            <div key={item.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.isOverdue ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                    }`}
                  >
                    {item.isOverdue ? 'Overdue' : `Due ${item.expectedDate}`}
                  </span>
                  {isFunded ? (
                    <span className="text-xs font-medium text-emerald-600">Category funded ✓</span>
                  ) : (
                    <span className="text-xs font-semibold text-red-700">
                      Short by {formatAUD(shortfall)} ⚠️
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">{formatAUD(item.expectedAmount)}</span>
                <button
                  type="button"
                  onClick={() => onMarkPaid(item)}
                  className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Mark Paid
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttentionItemsList;
