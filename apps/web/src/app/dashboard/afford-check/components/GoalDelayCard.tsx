'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { GoalDelayImpact } from '@money-matters/types';
import { Calendar, ShieldAlert, Sparkles } from 'lucide-react';

interface GoalDelayCardProps {
  goalDelays: GoalDelayImpact[];
}

export function GoalDelayCard({ goalDelays }: GoalDelayCardProps) {

  if (!goalDelays || goalDelays.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-orange-500" />
        <span>{t('canIAfford.impactedGoalsTitle', { count: goalDelays.length })}</span>
      </h3>

      <div className="space-y-3">
        {goalDelays.map((goal) => (
          <div
            key={goal.goalId}
            className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {goal.goalName}
                </span>
                {goal.isCommitted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="w-3 h-3" />
                    {t('canIAfford.goalDelayedCommittedBadge')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <Sparkles className="w-3 h-3" />
                    {t('canIAfford.goalDelayedOptionalBadge')}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 font-mono">
                {t('canIAfford.goalDelayedBy', { days: goal.delayDays })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">{t('canIAfford.goalOriginalDate')}</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {goal.originalTargetDate ?? t('canIAfford.notApplicable')}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-orange-300/60 dark:border-orange-800">
                <span className="text-orange-600 dark:text-orange-400 block text-[11px]">
                  {t('canIAfford.goalNewDate')}
                </span>
                <span className="font-mono font-bold text-orange-700 dark:text-orange-300">
                  {goal.newTargetDate ?? t('canIAfford.notApplicable')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
