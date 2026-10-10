'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { useLocale } from '../../../providers/LocaleProvider';

export interface BentoPoolsSectionProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly safetyBufferFloor?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly daysUntilPayday?: number;
  
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
  safetyBufferFloor = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  daysUntilPayday,
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

  const effectiveDays = daysUntilPayday !== undefined && daysUntilPayday > 0
    ? daysUntilPayday
    : Math.max(1, daysInMonth - currentDay);

  const dailySpendable = Math.max(0, everydayBalance / effectiveDays);
  const targetDailyBudget = everydayMonthlyBudget > 0 ? (everydayMonthlyBudget * 12) / 365 : 0;

  const isBillsRisk = billsShortfall > 0;
  const isPacingTight = !isBillsRisk && targetDailyBudget > 0 && dailySpendable < targetDailyBudget * 0.8;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Everyday Spending Pool Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.everydayDailyRateLabel')}
              </span>
              {isBillsRisk ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  {t('dashboard.hero.atRisk')}
                </span>
              ) : isPacingTight ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {t('dashboard.hero.pacingTightenedBadge')}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {t('dashboard.hero.trackingOnTrack')}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B] dark:text-zinc-100">
                  {format(dailySpendable)}
                </span>
                <span className="text-xs font-sans font-bold text-gray-400">/ day</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {daysUntilPayday !== undefined && daysUntilPayday <= 0
                  ? t('dashboard.hero.estRemainingToday', { amount: format(everydayBalance) })
                  : t('dashboard.hero.estRemaining', { amount: format(everydayBalance), days: effectiveDays })}
              </p>
            </div>
          </div>

          {/* Pacing Bar & Buffer Protection */}
          <div className="space-y-2 pt-4 mt-auto border-t border-gray-100 dark:border-zinc-800">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>{t('dashboard.hero.everydayAllowanceCycle', { amount: format(everydayMonthlyBudget) })}</span>
              {safetyBufferFloor > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold normal-case">
                  🛡️ {t('dashboard.hero.bufferProtected', { amount: format(safetyBufferFloor) })}
                </span>
              )}
            </div>
            <div className="relative h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-visible">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isBillsRisk ? 'bg-rose-500' : isPacingTight ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (dailySpendable / (targetDailyBudget || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bills Pool Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.billsPoolTitle')}
              </span>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B] dark:text-zinc-100">
                {format(billsBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.hero.billsRingFencedSubtitle')}
              </p>
            </div>

            {/* Shortfall or Coverage Status Banner */}
            {billsShortfall > 0 ? (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">
                      {t('dashboard.hero.shortfallOf', { amount: format(billsShortfall) })}
                    </span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 block">
                      {t('dashboard.hero.billsDueSummary', { count: billsDue14DaysCount, amount: format(totalBillsDue14Days) })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onMoveMoney}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  {t('dashboard.hero.coverShortfall')}
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>{t('dashboard.hero.billsFullyCovered')}</span>
              </div>
            )}
          </div>

          {/* Monthly Cap Footnote */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center text-xs text-gray-500 mt-auto">
            <span>{t('dashboard.hero.targetMonthlyBills', { amount: format(billsMonthlyBudget) })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoPoolsSection;
