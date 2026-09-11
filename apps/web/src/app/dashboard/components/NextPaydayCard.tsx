'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { t } from '@money-matters/i18n';
import { getEarliestPendingIncomeId } from '@money-matters/capability-budgeting';
import { useLocale } from '../../../providers/LocaleProvider';

export interface WebIncomeItem {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly expectedDate: string;
  readonly status?: string; // Add status to determine pending vs saved/draft
  readonly isSaved?: boolean;
  readonly bankAccountId?: string | null;
  readonly bankAccountName?: string | null;
  readonly availableToBudget?: number | null;
}

export interface NextPaydayCardProps {
  readonly upcomingIncomes: readonly WebIncomeItem[];
  readonly onPressRunSplit?: (eventId: string) => void;
  readonly onPressMarkReceived?: (eventId: string) => void;
  readonly onPressAllocate?: (eventId: string) => void;
  readonly onDeleteIncome?: (eventId: string) => void;
  readonly formatAUD?: (val: number | string) => string;
}

export const NextPaydayCard: React.FC<NextPaydayCardProps> = ({
  upcomingIncomes,
  onPressRunSplit,
  onPressMarkReceived,
  onPressAllocate,
  onDeleteIncome,
  formatAUD,
}) => {
  const { fmt, fmtDate: formatLocaleDate } = useLocale();
  const format = formatAUD ?? fmt;
  const handleSplitClick = (id: string) => {
    if (onPressRunSplit) onPressRunSplit(id);
    else if (onPressMarkReceived) onPressMarkReceived(id);
    else if (onPressAllocate) onPressAllocate(id);
  };

  const earliestPendingId = useMemo(() => {
    return getEarliestPendingIncomeId(upcomingIncomes as WebIncomeItem[]);
  }, [upcomingIncomes]);

  if (!upcomingIncomes || upcomingIncomes.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#1B2B4B]">Upcoming Income</h2>
          </div>
          <Link
            href="/dashboard/income-and-bills?tab=MATRIX"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Show More →
          </Link>
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
          <h2 className="text-sm font-extrabold text-[#1B2B4B]">
            Upcoming Income ({upcomingIncomes.length})
          </h2>
        </div>
        <Link
          href="/dashboard/income-and-bills?tab=MATRIX"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Show More →
        </Link>
      </div>

      <div className="space-y-3">
        {itemsToShow.map((income) => {
          let daysAwayText = '';
          let isOverdue = false;
          if (income.expectedDate) {
            const payDate = new Date(income.expectedDate);
            payDate.setHours(0, 0, 0, 0);
            const todayZero = new Date();
            todayZero.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((payDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) daysAwayText = t('dashboard.hero.dueToday') || 'Due today!';
            else if (diffDays > 0) daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
            else {
              isOverdue = true;
              daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
            }
          }

          const isEarliest = income.id === earliestPendingId;
          const isSaved = income.isSaved || income.status === "DRAFT" || income.status === "SAVED";

          return (
            <div
              key={income.id}
              className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/70 transition-colors"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#1B2B4B] block truncate">
                    {income.name}
                  </span>
                  {isEarliest && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[9px] rounded uppercase tracking-wider">
                      Next Payday
                    </span>
                  )}
                  {isSaved && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold text-[9px] rounded uppercase tracking-wider border border-blue-200">
                      Saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 font-mono">
                  <span className="font-semibold text-gray-900">{format(income.amount)}</span> · {daysAwayText}{' '}
                  {isOverdue && <strong className="font-extrabold text-rose-600 dark:text-rose-400">overdue </strong>}
                  ({formatLocaleDate(income.expectedDate)})
                </p>
                {income.bankAccountName && (
                  <p className="text-[11px] text-gray-500">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{income.bankAccountName}</span>
                    {income.availableToBudget !== undefined && income.availableToBudget !== null && (
                      <>
                        {' '}·{' '}
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{format(income.availableToBudget)}</span>{' '}
                        {t('dashboard.availableToBudget', { defaultValue: 'available to budget' })}
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSplitClick(income.id)}
                  className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer transition-colors px-2 py-1"
                  title="Review and Edit Splits"
                >
                  {t("common.runSplit", { defaultValue: "Run Split" })}
                </button>
                {onDeleteIncome && (
                  <button
                    type="button"
                    onClick={() => onDeleteIncome(income.id)}
                    className="text-xs text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 cursor-pointer transition-colors px-1.5 py-1"
                    title={t("common.delete", { defaultValue: "Delete" })}
                  >
                    {t("common.delete", { defaultValue: "Delete" })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NextPaydayCard;
