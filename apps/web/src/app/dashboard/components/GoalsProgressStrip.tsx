'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { t } from '@money-matters/i18n';

export interface GoalCategoryItem {
  readonly id: string;
  readonly name: string;
  readonly currentBalance: string | number;
  readonly healthStatus?: string;
  readonly targetAmount?: string | number | null;
  readonly targetDate?: string | null;
  readonly createdAt?: string | Date | null;
  readonly schedule?: {
    targetAmount?: string | null;
    targetDate?: string | null;
  } | null;
}

export interface GoalsProgressStripProps {
  readonly goalCategories: readonly GoalCategoryItem[];
  readonly formatAUD: (val: number | string) => string;
}

export const GoalsProgressStrip: React.FC<GoalsProgressStripProps> = ({
  goalCategories,
  formatAUD,
}) => {
  const totalGoals = goalCategories?.length ?? 0;
  const onTrackGoals = (goalCategories ?? []).filter(
    (g) => g.healthStatus === 'GREEN' || !g.healthStatus
  ).length;

  const processedGoals = useMemo(() => {
    if (!goalCategories || goalCategories.length === 0) return [];
    const nowTime = new Date().getTime();

    return goalCategories.map((g) => {
      const bal = parseFloat(String(g.currentBalance || '0'));
      const target = parseFloat(String(g.targetAmount || g.schedule?.targetAmount || '0'));
      const fundedPct = target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : 0;

      let timeElapsedPct: number | null = null;
      let isOverdue = false;

      if (g.targetDate) {
        const targetTime = new Date(g.targetDate).getTime();
        const createdTime = g.createdAt
          ? new Date(g.createdAt).getTime()
          : targetTime - 90 * 24 * 60 * 60 * 1000;
        const totalDuration = Math.max(1, targetTime - createdTime);
        const elapsedDuration = Math.max(0, nowTime - createdTime);
        timeElapsedPct = Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100)));
        isOverdue = nowTime > targetTime && fundedPct < 100;
      }

      return {
        ...g,
        balanceNum: bal,
        targetNum: target,
        fundedPct,
        timeElapsedPct,
        isOverdue,
      };
    });
  }, [goalCategories]);

  // Sort by attention priority: Overdue first, then RED, then AMBER / behind pace, then lowest funded %
  const topAttentionGoals = useMemo(() => {
    const getScore = (g: (typeof processedGoals)[0]) => {
      if (g.isOverdue) return 1000;
      if (g.healthStatus === 'RED') return 500;
      if (g.healthStatus === 'AMBER') return 300;
      if (g.timeElapsedPct !== null && g.fundedPct < g.timeElapsedPct * 0.8) return 200;
      return 100 - g.fundedPct;
    };

    return [...processedGoals].sort((a, b) => getScore(b) - getScore(a)).slice(0, 2);
  }, [processedGoals]);

  if (!goalCategories || goalCategories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h3 className="text-sm font-extrabold text-[#1B2B4B] dark:text-zinc-100">
              {t('dashboard.goals.title', { defaultValue: 'Goals' })}
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">
              {onTrackGoals === totalGoals
                ? (t('dashboard.goals.allOnTrack', { total: totalGoals }) || `All ${totalGoals} goals on track 🎉`)
                : (t('dashboard.goals.onTrack', { count: onTrackGoals, total: totalGoals }) || `${onTrackGoals} of ${totalGoals} on track`)}
            </span>
          </div>

          <Link
            href="/dashboard/pools?type=GOAL"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
          >
            {t('dashboard.goals.viewAll', { defaultValue: 'View All Goals →' })}
          </Link>
        </div>

        {/* Top 2 goals requiring attention */}
        <div className="flex flex-col gap-3">
          {topAttentionGoals.map((goal) => {
            const isCompleted = goal.fundedPct >= 100;
            const isLagging = goal.timeElapsedPct !== null && goal.fundedPct < goal.timeElapsedPct * 0.8;
            const isJustBehind = goal.timeElapsedPct !== null && goal.fundedPct < goal.timeElapsedPct && !isLagging;
            const isOnTrack = goal.timeElapsedPct !== null ? goal.fundedPct >= goal.timeElapsedPct : goal.fundedPct >= 50;

            const barColor = isCompleted
              ? 'bg-emerald-500'
              : goal.isOverdue || isLagging
              ? 'bg-rose-500'
              : isJustBehind
              ? 'bg-amber-500'
              : isOnTrack
              ? 'bg-emerald-500'
              : 'bg-blue-500';

            return (
              <div
                key={goal.id}
                className="bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 rounded-xl p-3 space-y-2 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-800 dark:text-zinc-200 truncate">{goal.name}</span>
                  <span className="font-mono text-gray-600 dark:text-zinc-400 font-semibold">{goal.fundedPct}%</span>
                </div>

                {/* Pacing Progress Bar with Needle */}
                <div className="relative h-2.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${goal.fundedPct}%` }}
                  />
                  {goal.timeElapsedPct !== null && goal.timeElapsedPct > 0 && goal.timeElapsedPct < 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-slate-800 dark:bg-white rounded-full z-10 -ml-0.5 shadow-xs pointer-events-none"
                      style={{ left: `${goal.timeElapsedPct}%` }}
                      title={t('dashboard.goals.pacingTarget', {
                        percent: goal.timeElapsedPct,
                        defaultValue: `Pacing Target: ${goal.timeElapsedPct}%`,
                      })}
                    />
                  )}
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                  <span>
                    {formatAUD(goal.balanceNum)} {goal.targetNum > 0 && `/ ${formatAUD(goal.targetNum)}`}
                  </span>
                  {goal.isOverdue ? (
                    <span className="text-rose-600 font-bold font-sans">Overdue</span>
                  ) : goal.timeElapsedPct !== null ? (
                    <span
                      className={`font-sans font-semibold ${
                        isOnTrack ? 'text-emerald-600' : isJustBehind ? 'text-amber-600' : 'text-rose-600'
                      }`}
                    >
                      {isOnTrack ? 'On Track' : isJustBehind ? 'Just Behind' : 'Lagging'} ({goal.timeElapsedPct}% pace)
                    </span>
                  ) : (
                    <span>{goal.fundedPct}% funded</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GoalsProgressStrip;
