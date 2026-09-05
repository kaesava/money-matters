'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { fmtDate } from '@money-matters/ui/web';

export interface WebIncomeItem {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly expectedDate: string;
}

export interface NextPaydayCardProps {
  readonly upcomingIncomes: readonly WebIncomeItem[];
  readonly onPressNextPay: (eventId: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const NextPaydayCard: React.FC<NextPaydayCardProps> = ({
  upcomingIncomes,
  onPressNextPay,
  formatAUD,
}) => {
  if (!upcomingIncomes || upcomingIncomes.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💰</span>
          <h2 className="text-sm font-extrabold text-[#1B2B4B]">Upcoming Income & Paydays</h2>
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
            Upcoming Income & Paydays ({upcomingIncomes.length})
          </h2>
        </div>
        <a
          href="/dashboard/income-and-bills?tab=matrix-plan"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Bulk Plan →
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

              <button
                type="button"
                onClick={() => onPressNextPay(income.id)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                Log Payday →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NextPaydayCard;
