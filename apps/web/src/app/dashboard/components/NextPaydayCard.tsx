'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { fmtDate } from '@money-matters/ui/web';

export interface NextPaydayCardProps {
  readonly nextPayday: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const NextPaydayCard: React.FC<NextPaydayCardProps> = ({
  nextPayday,
  onPressNextPay,
  formatAUD,
}) => {
  if (!nextPayday) return null;

  let daysAwayText = '';
  if (nextPayday.expectedDate) {
    const payDate = new Date(nextPayday.expectedDate);
    payDate.setHours(0, 0, 0, 0);
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) daysAwayText = t('dashboard.hero.dueToday') || 'Due today!';
    else if (diffDays > 0) daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
    else daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  }

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold flex items-center justify-center text-lg shrink-0">
          💰
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
            {t('dashboard.nextPay.title') || 'Next Payday'}
          </span>
          <h4 className="text-sm font-bold text-[#1B2B4B] mt-1">
            {nextPayday.name}
          </h4>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            <span className="font-semibold text-gray-900">{formatAUD(nextPayday.amount)}</span> · {daysAwayText} ({fmtDate(nextPayday.expectedDate)})
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <a
          href="/dashboard/income-and-bills?tab=matrix-plan"
          className="text-xs font-bold text-zinc-500 hover:text-zinc-800 underline transition-colors"
        >
          Bulk Log Paydays
        </a>
        <button
          type="button"
          onClick={() => onPressNextPay(nextPayday.id)}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer w-full sm:w-auto text-center"
        >
          Log Payday →
        </button>
      </div>
    </div>
  );
};

export default NextPaydayCard;
