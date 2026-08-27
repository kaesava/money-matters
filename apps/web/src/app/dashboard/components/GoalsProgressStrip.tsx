'use client';

import React from 'react';
import Link from 'next/link';
import { t } from '@money-matters/i18n';

export interface GoalCategoryItem {
  id: string;
  name: string;
  currentBalance: string;
  healthStatus?: string;
  schedule?: {
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
  if (!goalCategories || goalCategories.length === 0) return null;

  const totalGoals = goalCategories.length;
  const onTrackGoals = goalCategories.filter(
    (g) => g.healthStatus === 'GREEN' || !g.healthStatus
  ).length;

  // Process details for each goal
  const processedGoals = goalCategories.map((g) => {
    const bal = parseFloat(g.currentBalance || '0');
    const target = parseFloat(g.schedule?.targetAmount || '0');
    const pct = target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : 100;
    return {
      ...g,
      balanceNum: bal,
      targetNum: target,
      pct,
    };
  });

  // Check if any goal is >= 90% filled but not 100%
  const almostDoneGoal = processedGoals.find((g) => g.pct >= 90 && g.pct < 100);

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-extrabold text-[#1B2B4B]">
            {t('dashboard.goals.title') || 'Savings Goals'}
          </h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {onTrackGoals === totalGoals
              ? (t('dashboard.goals.allOnTrack', { total: totalGoals }) || `All ${totalGoals} goals on track 🎉`)
              : (t('dashboard.goals.onTrack', { count: onTrackGoals, total: totalGoals }) || `${onTrackGoals} of ${totalGoals} on track`)}
          </span>
        </div>

        <Link
          href="/dashboard/pools?type=GOAL"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
        >
          {t('dashboard.goals.viewAll') || 'View All Goals →'}
        </Link>
      </div>

      {/* Near completion celebration banner */}
      {almostDoneGoal && (
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200/60 rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-emerald-900">
          <span className="text-sm">🎉</span>
          <span>
            <strong>{almostDoneGoal.name}</strong> is at <strong>{almostDoneGoal.pct}%</strong> — almost at target!
          </span>
        </div>
      )}

      {/* Mini goals cards/progress bars list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {processedGoals.slice(0, 3).map((goal) => (
          <div
            key={goal.id}
            className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 space-y-1.5"
          >
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-800 truncate max-w-[130px]">{goal.name}</span>
              <span className="font-mono text-gray-600 font-semibold">{goal.pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  goal.pct >= 100
                    ? 'bg-emerald-500'
                    : goal.pct >= 90
                    ? 'bg-teal-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${goal.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-gray-500">
              <span>{formatAUD(goal.balanceNum)}</span>
              {goal.targetNum > 0 && <span>/ {formatAUD(goal.targetNum)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalsProgressStrip;
