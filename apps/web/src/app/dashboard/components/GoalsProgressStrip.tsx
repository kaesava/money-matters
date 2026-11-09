'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { t } from '@money-matters/i18n';
import { useLocale } from '../../../providers/LocaleProvider';

export interface GoalCategoryItem {
  readonly id: string;
  readonly name: string;
  readonly currentBalance: string | number;
  readonly healthStatus?: string;
  readonly targetAmount?: string | number | null;
  readonly targetDate?: string | null;
  readonly endDate?: string | null;
  readonly goalMode?: 'TARGET_DATE' | 'ONGOING' | null;
  readonly enteredAmount?: string | null;
  readonly budgetFrequency?: string | null;
  readonly createdAt?: string | Date | null;
  readonly schedule?: {
    targetAmount?: string | null;
    targetDate?: string | null;
    endDate?: string | null;
  } | null;
}

export interface GoalsProgressStripProps {
  readonly goalCategories: readonly GoalCategoryItem[];
  readonly formatCurrency?: (val: number | string) => string;
}

export const GoalsProgressStrip: React.FC<GoalsProgressStripProps> = ({
  goalCategories,
  formatCurrency,
}) => {
  const { fmt } = useLocale();
  const format = formatCurrency ?? fmt;

  const totalGoals = goalCategories?.length ?? 0;

  const {
    totalAccumulatedSavings,
    targetDateGoalsCount,
    recurringGoalsCount,
    totalMilestoneBalance,
    totalMilestoneTarget,
    milestonePct,
    monthlyRecurringPace,
    onTrackGoals,
  } = useMemo(() => {
    let accSavings = 0;
    let targetCount = 0;
    let recurringCount = 0;
    let milestoneBal = 0;
    let milestoneTgt = 0;
    let recurringPace = 0;
    let onTrack = 0;

    for (const g of goalCategories ?? []) {
      const bal = parseFloat(String(g.currentBalance || '0')) || 0;
      accSavings += bal;

      const isRecurring = g.goalMode === 'ONGOING';
      if (isRecurring) {
        recurringCount += 1;
        const rawAmt = parseFloat(String(g.targetAmount || g.enteredAmount || '0')) || 0;
        const freq = g.budgetFrequency;
        if (freq === 'WEEKLY') {
          recurringPace += (rawAmt * 52) / 12;
        } else if (freq === 'FORTNIGHTLY') {
          recurringPace += (rawAmt * 26) / 12;
        } else if (freq === 'ANNUALLY') {
          recurringPace += rawAmt / 12;
        } else {
          recurringPace += rawAmt;
        }
      } else {
        targetCount += 1;
        const tgt = parseFloat(String(g.targetAmount || g.schedule?.targetAmount || '0')) || 0;
        milestoneBal += bal;
        milestoneTgt += tgt;
      }

      if (g.healthStatus === 'GREEN' || !g.healthStatus) {
        onTrack += 1;
      }
    }

    const mPct = milestoneTgt > 0 ? Math.min(100, Math.round((milestoneBal / milestoneTgt) * 100)) : 0;

    return {
      totalAccumulatedSavings: accSavings,
      targetDateGoalsCount: targetCount,
      recurringGoalsCount: recurringCount,
      totalMilestoneBalance: milestoneBal,
      totalMilestoneTarget: milestoneTgt,
      milestonePct: mPct,
      monthlyRecurringPace: recurringPace,
      onTrackGoals: onTrack,
    };
  }, [goalCategories]);

  const allOnTrack = totalGoals > 0 && onTrackGoals === totalGoals;

  if (totalGoals === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            {t('dashboard.goals.cardTitle')}
          </h3>
          <Link
            href="/dashboard/envelopes?type=GOAL"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
          >
            {t('dashboard.goals.viewAll')} →
          </Link>
        </div>

        <div className="my-auto py-3 space-y-1">
          <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            {t('dashboard.goals.totalSavedInvested')}
          </div>
          <div className="font-mono tabular-nums text-3xl font-extrabold text-[#1B2B4B] dark:text-zinc-100">
            {format(0)}
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 pt-1">
            {t('dashboard.goals.noGoalsSubtitle')}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
          <Link
            href="/dashboard/envelopes?type=GOAL"
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('dashboard.goals.addGoalAction')} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            {t('dashboard.goals.cardTitle')}
          </h3>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              allOnTrack
                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
            }`}
          >
            {allOnTrack
              ? t('dashboard.goals.allOnTrack', { total: totalGoals })
              : t('dashboard.goals.onTrack', { count: onTrackGoals, total: totalGoals })}
          </span>
        </div>

        <Link
          href="/dashboard/envelopes?type=GOAL"
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
        >
          {t('dashboard.goals.viewAll')} →
        </Link>
      </div>

      {/* Middle Hero + Dual Mode Summary */}
      <div className="my-auto py-1 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            {t('dashboard.goals.totalSavedInvested')}
          </div>
          <div className="font-mono tabular-nums text-3xl font-extrabold text-[#1B2B4B] dark:text-zinc-100 tracking-tight">
            {format(totalAccumulatedSavings)}
          </div>
        </div>

        {/* Target Milestone Progress */}
        {targetDateGoalsCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600 dark:text-zinc-300">
                {t('dashboard.goals.title')}
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-zinc-400">
                {t('dashboard.goals.milestonesFunded', {
                  funded: format(totalMilestoneBalance),
                  target: format(totalMilestoneTarget),
                  percent: milestonePct,
                })}
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Recurring Ongoing Pace */}
        {recurringGoalsCount > 0 && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="font-semibold text-slate-600 dark:text-zinc-300">
              {t('dashboard.goals.ongoingPill')}
            </span>
            <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
              {t('dashboard.goals.recurringPace', { amount: format(monthlyRecurringPace) })}
            </span>
          </div>
        )}
      </div>

      {/* Footer Breakdown */}
      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 text-[11px] font-medium text-slate-400 dark:text-zinc-500">
        {t('dashboard.goals.goalBreakdown', {
          total: totalGoals,
          targetCount: targetDateGoalsCount,
          recurringCount: recurringGoalsCount,
        })}
      </div>
    </div>
  );
};

export default GoalsProgressStrip;
