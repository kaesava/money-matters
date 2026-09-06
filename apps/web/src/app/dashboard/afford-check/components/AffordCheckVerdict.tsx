'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { CanAffordVerdictType } from '@money-matters/types';

interface AffordCheckVerdictProps {
  data: CanAffordVerdictType;
}

export function AffordCheckVerdict({ data }: AffordCheckVerdictProps) {

  const getVerdictStyle = () => {
    switch (data.verdict) {
      case 'SAFE_YES':
        return {
          container: 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100',
          badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
          emoji: t('canIAfford.verdictEmojiSafeYes'),
          title: t('canIAfford.verdictSafeYes'),
        };
      case 'PACING_TIGHT':
        return {
          container: 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100',
          badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
          emoji: t('canIAfford.verdictEmojiPacingTight'),
          title: t('canIAfford.verdictPacingTight'),
        };
      case 'BILLS_RISK':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-950 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-100',
          badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
          emoji: t('canIAfford.verdictEmojiBillsRisk'),
          title: t('canIAfford.verdictBillsRisk'),
        };
      case 'WAIT_FOR_PAYCYCLE':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-950 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100',
          badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
          emoji: t('canIAfford.verdictEmojiWaitForPaycycle'),
          title: t('canIAfford.verdictWaitForPaycycle', { date: data.canAffordAt }),
        };
      case 'GOAL_DELAYED':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-950 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-100',
          badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
          emoji: t('canIAfford.verdictEmojiGoalDelayed'),
          title: t('canIAfford.verdictGoalDelayed'),
        };
      case 'HARD_NO':
        return {
          container: 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100',
          badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300',
          emoji: t('canIAfford.verdictEmojiHardNo'),
          title: t('canIAfford.verdictHardNo'),
        };
    }
  };

  const style = getVerdictStyle();

  return (
    <div className={`p-6 rounded-2xl border ${style.container} transition-all duration-300 shadow-sm space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label="verdict status">
            {style.emoji}
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{style.title}</h2>
            {data.verdict === 'SAFE_YES' && (
              <p className="text-sm opacity-80 mt-0.5">
                {t('canIAfford.dailyPacingRemaining')}:{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {t('canIAfford.dailyPaceLabel', { amount: data.dailyPacingAfterSpend })}
                </span>{' '}
                (floor: <span className="font-mono tabular-nums">${data.dailyPacingFloor}</span>)
              </p>
            )}
            {data.verdict === 'PACING_TIGHT' && (
              <p className="text-sm opacity-80 mt-0.5">
                {t('canIAfford.dailyPacingRemaining')}:{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {t('canIAfford.dailyPaceLabel', { amount: data.dailyPacingAfterSpend })}
                </span>{' '}
                (below floor: <span className="font-mono tabular-nums">${data.dailyPacingFloor}</span>)
              </p>
            )}
            {data.verdict === 'WAIT_FOR_PAYCYCLE' && (
              <p className="text-sm opacity-80 mt-0.5">
                {t('canIAfford.paycyclesAwayLabel', { n: data.paycyclesAway })} •{' '}
                {t('canIAfford.projectedEverydayLabel', { amount: data.projectedEverydayAtThatDate })}
              </p>
            )}
            {data.verdict === 'GOAL_DELAYED' && (
              <p className="text-sm opacity-80 mt-0.5">
                {t('canIAfford.recurringMonthlyImpactLabel', { amount: data.recurringMonthlyImpact })} •{' '}
                {data.goalDelays.length} goal(s) pushed back
              </p>
            )}
            {data.verdict === 'HARD_NO' && (
              <p className="text-sm opacity-80 mt-0.5">
                {t('canIAfford.shortfallLabel', { amount: data.shortfall })} • 12-month horizon
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
