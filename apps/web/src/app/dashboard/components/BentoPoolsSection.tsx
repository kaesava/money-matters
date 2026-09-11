'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { useLocale } from '../../../providers/LocaleProvider';

export interface BentoPoolsSectionProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  
  // Integrated Shortfall Alert Props
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;

  readonly onMoveMoney: () => void;
  readonly formatAUD?: (val: number | string) => string;
}

export const BentoPoolsSection: React.FC<BentoPoolsSectionProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onMoveMoney,
  formatAUD,
}) => {
  const { fmt } = useLocale();
  const format = formatAUD ?? fmt;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();
  const elapsedPct = (currentDay / daysInMonth) * 100;

  // Everyday pacing calculation
  const everydaySpentPct = everydayMonthlyBudget > 0 
    ? Math.min(100, Math.max(0, ((everydayMonthlyBudget - everydayBalance) / everydayMonthlyBudget) * 100))
    : 0;
  const isEverydayPacingOk = everydaySpentPct <= elapsedPct;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Everyday Spending Pool Card */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.everydayBalance') || 'Everyday Spending Pool'}
              </span>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B]">
                {format(everydayBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Discretionary spending balance
              </p>
            </div>
          </div>

          {/* Pacing Bar */}
          <div className="space-y-1.5 pt-4 mt-auto border-t border-gray-100">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Monthly Budget: {format(everydayMonthlyBudget)}</span>
              <span>{Math.round(everydaySpentPct)}% spent</span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isEverydayPacingOk ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${everydaySpentPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-blue-600 rounded-full shadow-2xs pointer-events-none"
                style={{ left: `${elapsedPct}%` }}
                title="Today"
              />
            </div>
          </div>
        </div>

        {/* Bills Pool Card */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                Bills Pool
              </span>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B]">
                {format(billsBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ring-fenced for committed bills
              </p>
            </div>

            {/* Shortfall or Coverage Status Banner */}
            {billsShortfall > 0 ? (
              <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 block">
                      Shortfall of {format(billsShortfall)}
                    </span>
                    <span className="text-[10px] text-rose-700 block">
                      {billsDue14DaysCount} bill(s) totaling {format(totalBillsDue14Days)} due in 14 days
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onMoveMoney}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  Cover →
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                <span>Next 14 days of bills are fully covered!</span>
              </div>
            )}
          </div>

          {/* Monthly Cap Footnote */}
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 mt-auto">
            <span>Target Monthly Bills:</span>
            <span className="font-mono font-semibold">{format(billsMonthlyBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoPoolsSection;
