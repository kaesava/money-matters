'use client';

import React from 'react';
import { CanAffordVerdictType } from '@money-matters/types';

export interface WebDashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly needsAttentionCount: number;
  readonly behindCount: number;
  readonly onTrackCount: number;
  readonly canAffordAmount: string;
  readonly setCanAffordAmount: (amt: string) => void;
  readonly canAffordData?: CanAffordVerdictType | null;
  readonly nextPayday?: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
  readonly onSelectFilter?: (health: string) => void;
  readonly formatAUD: (val: number | string) => string;
}

export const DashboardHeroCard: React.FC<WebDashboardHeroCardProps> = ({
  everydayBalance,
  needsAttentionCount,
  behindCount,
  onTrackCount,
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
  nextPayday,
  onPressNextPay,
  onSelectFilter,
  formatAUD,
}) => {
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
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6 flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Everyday Balance + Sleek Interactive Badges */}
        <div className="space-y-3 flex-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Everyday Balance</span>
            <h1 className="text-4xl font-bold text-gray-900 mt-1">{formatAUD(everydayBalance)}</h1>
          </div>

          {/* 3 Premium Interactive Category Health Badges */}
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            {/* Behind Badge */}
            <button
              type="button"
              onClick={() => onSelectFilter?.('RED')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200/80 hover:bg-rose-100/90 shadow-2xs hover:shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span>Behind</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-200/80 text-rose-950">
                {behindCount}
              </span>
            </button>

            {/* Needs Attention Badge */}
            <button
              type="button"
              onClick={() => onSelectFilter?.('AMBER')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/80 hover:bg-amber-100/90 shadow-2xs hover:shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>Needs Attention</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-200/80 text-amber-950">
                {needsAttentionCount}
              </span>
            </button>

            {/* On Track Badge */}
            <button
              type="button"
              onClick={() => onSelectFilter?.('GREEN')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/90 shadow-2xs hover:shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>On Track</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-200/80 text-emerald-950">
                {onTrackCount}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: "Can We Afford This?" Widget directly next to Everyday Balance */}
        <div className="w-full lg:w-80 bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Can We Afford This?</h3>
          <input
            type="number"
            step="0.01"
            placeholder="Enter amount ($)"
            value={canAffordAmount}
            onChange={(e) => setCanAffordAmount(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {canAffordData && (
            <div
              className={`p-2.5 rounded-lg text-xs font-bold ${
                canAffordData.verdict === 'YES'
                  ? 'bg-emerald-100 text-emerald-800'
                  : canAffordData.verdict === 'YES_WITH_IMPACT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {canAffordData.verdict === 'YES' && `YES! Available in Everyday (${formatAUD(canAffordData.everydayRemaining)} left)`}
              {canAffordData.verdict === 'YES_WITH_IMPACT' && `YES WITH IMPACT: Dips into ${canAffordData.affectedBucketName}`}
              {canAffordData.verdict === 'WAIT' && `WAIT: Paycheck due in ${canAffordData.daysUntilNextPaycheck} days`}
              {canAffordData.verdict === 'NO' && `NO: Shortfall of ${formatAUD(canAffordData.shortfall)}`}
            </div>
          )}
        </div>
      </div>

      <hr className="my-2 border-gray-100" />

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
