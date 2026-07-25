'use client';

import React from 'react';

export interface WebDashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly atRiskCount: number;
  readonly missedCount: number;
  readonly nextPayday?: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const DashboardHeroCard: React.FC<WebDashboardHeroCardProps> = ({
  everydayBalance,
  atRiskCount,
  missedCount,
  nextPayday,
  onPressNextPay,
  formatAUD,
}) => {
  const statusBg = missedCount > 0 ? 'bg-red-100 text-red-800' : atRiskCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  const statusText = missedCount > 0 ? `${missedCount} Missed` : atRiskCount > 0 ? `${atRiskCount} At Risk` : 'On Track';

  let daysAwayText = '';
  if (nextPayday?.expectedDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payDate = new Date(nextPayday.expectedDate);
    payDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) daysAwayText = 'Due today!';
    else if (diffDays > 0) daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
    else daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Everyday Balance</span>
          <h1 className="text-4xl font-bold text-gray-900 mt-1">{formatAUD(everydayBalance)}</h1>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
          ● {statusText}
        </span>
      </div>

      <hr className="my-4 border-gray-100" />

      {nextPayday ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
              $
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Next Pay: {nextPayday.name}</p>
              <p className="text-xs text-gray-500">
                {formatAUD(nextPayday.amount)} • {daysAwayText} ({nextPayday.expectedDate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPressNextPay(nextPayday.id)}
            className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Process Pay →
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">No upcoming payday scheduled</p>
      )}
    </div>
  );
};

export default DashboardHeroCard;
