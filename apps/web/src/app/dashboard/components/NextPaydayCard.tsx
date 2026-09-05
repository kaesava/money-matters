'use client';

import React, { useMemo } from 'react';
import { t } from '@money-matters/i18n';
import { fmtDate } from '@money-matters/ui/web';
import { getEarliestPendingIncomeId } from '@money-matters/capability-budgeting';

export interface WebIncomeItem {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly expectedDate: string;
  readonly status?: string; // Add status to determine pending
}

export interface NextPaydayCardProps {
  readonly upcomingIncomes: readonly WebIncomeItem[];
  readonly onPressMarkReceived: (eventId: string) => void;
  readonly onPressAllocate: (eventId: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const NextPaydayCard: React.FC<NextPaydayCardProps> = ({
  upcomingIncomes,
  onPressMarkReceived,
  onPressAllocate,
  formatAUD,
}) => {
  const earliestPendingId = useMemo(() => {
    return getEarliestPendingIncomeId(upcomingIncomes as WebIncomeItem[]);
  }, [upcomingIncomes]);

  if (!upcomingIncomes || upcomingIncomes.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <h2 className="text-sm font-extrabold text-[#1B2B4B]">Upcoming Income</h2>
          </div>
          <a
            href="/dashboard/income-and-bills?tab=EVENTS&type=INCOME"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Show More →
          </a>
        </div>
        <p className="text-xs text-gray-400 py-4 text-center">No upcoming paydays scheduled.</p>
      </div>
    );
  }

  const itemsToShow = upcomingIncomes.slice(0, 3);

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h2 className="text-sm font-extrabold text-[#1B2B4B]">
            Upcoming Income ({upcomingIncomes.length})
          </h2>
        </div>
        <a
          href="/dashboard/income-and-bills?tab=EVENTS&type=INCOME"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Show More →
        </a>
      </div>

      <div className="space-y-3">
        {itemsToShow.map((income) => {
          let daysAwayText = '';
          if (income.expectedDate) {
            const payDate = new Date(income.expectedDate);
            payDate.setHours(0, 0, 0, 0);
            const todayZero = new Date();
            todayZero.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) daysAwayText = t('dashboard.hero.dueToday') || 'Due today!';
            else if (diffDays > 0) daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
            else daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
          }

          const isEarliest = income.id === earliestPendingId;

          return (
            <div
              key={income.id}
              className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/70 transition-colors"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-[#1B2B4B] block truncate">
                  {income.name}
                </span>
                <p className="text-[11px] text-gray-500 font-mono">
                  <span className="font-semibold text-gray-900">{formatAUD(income.amount)}</span> · {daysAwayText} ({fmtDate(income.expectedDate)})
                </p>
              </div>

              {isEarliest ? (
                <button
                  type="button"
                  onClick={() => onPressMarkReceived(income.id)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  {t("common.markReceived")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPressAllocate(income.id)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  {t("common.allocate")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NextPaydayCard;
