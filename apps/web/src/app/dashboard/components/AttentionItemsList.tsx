import React from 'react';
import { Spinner } from "@money-matters/ui/web";
import { useIconVisibility } from '@money-matters/ui';

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

export interface WebAttentionItemsListProps {
  readonly items: readonly WebAttentionItem[];
  readonly onMarkPaid: (item: WebAttentionItem, amount: number, date: string) => void;
  readonly onSkip?: (item: WebAttentionItem) => void;
  readonly onSave?: (item: WebAttentionItem, amount: number, date: string) => void;
  readonly formatAUD: (val: number | string) => string;
  readonly markingPaidId?: string | null;
  readonly onNavigateCategory?: (categoryName: string) => void;
}

export const AttentionItemsList: React.FC<WebAttentionItemsListProps> = ({
  items,
  onMarkPaid,
  onSkip,
  onSave,
  formatAUD,
  markingPaidId,
  onNavigateCategory,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editAmount, setEditAmount] = React.useState("");
  const [editDate, setEditDate] = React.useState("");
  const { showIcons } = useIconVisibility();

  if (!items || items.length === 0) return null;

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

  // Sort: Overdue first (Red tier), then Upcoming within 3 days (Amber tier)
  const sortedItems = [...items].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.expectedDate.localeCompare(b.expectedDate);
  });

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 mb-6 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        {showIcons && <span className="text-lg">⚠️</span>}
        <h2 className="text-sm font-extrabold text-[#1B2B4B]">
          Bills Needing Attention ({items.length})
        </h2>
      </div>

      <div className="divide-y divide-zinc-100">
        {sortedItems.map((item) => {
          const isEditing = editingId === item.id;
          const currentDate = isEditing ? editDate : item.expectedDate;
          const currentAmount = isEditing ? parseFloat(editAmount) || item.expectedAmount : item.expectedAmount;
          const isFutureDate = currentDate > todayStr;

          // Severity calculation
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
                  {isEditing ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="px-2 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  ) : (
                    <span className={`text-xs font-medium ${isOverdue ? "text-rose-700 font-bold" : "text-zinc-500"}`}>
                      Due: {item.expectedDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-24 px-2 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-right"
                  />
                ) : (
                  <span className="text-sm font-black text-[#1B2B4B] font-mono tabular-nums">
                    {formatAUD(item.expectedAmount)}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (isFutureDate && onSave) {
                            onSave(item, currentAmount, currentDate);
                          } else {
                            onMarkPaid(item, currentAmount, currentDate);
                          }
                          setEditingId(null);
                        }}
                        disabled={markingPaidId === item.id}
                        className={`text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                          isFutureDate ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {markingPaidId === item.id && <Spinner size="sm" />}
                        {isFutureDate ? "Save" : "Mark Paid"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditAmount(item.expectedAmount.toFixed(2));
                          setEditDate(item.expectedDate);
                        }}
                        className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        Mark Paid
                      </button>
                      {onSkip && (
                        <button
                          type="button"
                          onClick={() => onSkip(item)}
                          className="bg-zinc-100 text-zinc-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-200 border border-zinc-200 transition-colors"
                        >
                          Skip
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttentionItemsList;
