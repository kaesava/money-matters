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
              <div>
                <p className="text-sm opacity-90 mt-0.5 font-medium">
                  {t('canIAfford.remainingUntilPayday', { amount: data.everydayRemaining, date: data.nextPaydayDate })}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {t('canIAfford.safeCushionLabel', { amount: data.safeCushion })} • {t('canIAfford.billsProtectedNotice')}
                </p>
                {data.startAdvice && (
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mt-2 bg-emerald-100/60 dark:bg-emerald-900/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    💡 {t('canIAfford.startAdviceLabel', { advice: data.startAdvice })}
                  </p>
                )}
              </div>
            )}
            {data.verdict === 'PACING_TIGHT' && (
              <div>
                <p className="text-sm opacity-90 mt-0.5 font-medium">
                  {t('canIAfford.remainingUntilPayday', { amount: data.everydayRemaining, date: data.nextPaydayDate })}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {t('canIAfford.tightCushionNotice', { amount: data.cushionShortfall, cushion: data.safeCushion })}
                </p>
                {data.startAdvice && (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mt-2 bg-amber-100/60 dark:bg-amber-900/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    💡 {t('canIAfford.startAdviceLabel', { advice: data.startAdvice })}
                  </p>
                )}
              </div>
            )}
            {data.verdict === 'BILLS_RISK' && (
              <p className="text-sm opacity-90 mt-0.5">
                {t('canIAfford.billsBeforePayday')}: <span className="font-mono font-semibold tabular-nums">${data.upcomingBillsBeforePayday}</span> • {t('canIAfford.netEffectiveSpendable')}: <span className="font-mono font-semibold tabular-nums">${data.effectiveAfterBills}</span>
              </p>
            )}
            {data.verdict === 'WAIT_FOR_PAYCYCLE' && (
              <div>
                <p className="text-sm opacity-90 mt-0.5">
                  {t('canIAfford.shortfallLabel', { amount: data.shortfallToday })} • {t('canIAfford.paycyclesAwayLabel', { n: data.paycyclesAway })}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {t('canIAfford.projectedEverydayLabel', { amount: data.projectedEverydayAtThatDate })}
                </p>
              </div>
            )}
            {data.verdict === 'GOAL_DELAYED' && (
              <div>
                <p className="text-sm opacity-90 mt-0.5">
                  {t('canIAfford.recurringMonthlyImpactLabel', { amount: data.recurringMonthlyImpact })} • {data.goalDelays.length} goal(s) pushed back
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  {t('canIAfford.billsProtectedNotice')}
                </p>
                {data.startAdvice && (
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mt-2 bg-orange-100/60 dark:bg-orange-900/40 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
                    💡 {t('canIAfford.startAdviceLabel', { advice: data.startAdvice })}
                  </p>
                )}
              </div>
            )}
            {data.verdict === 'HARD_NO' && (
              <p className="text-sm opacity-90 mt-0.5">
                {t('canIAfford.shortfallLabel', { amount: data.shortfall })} • 12-month horizon
              </p>
            )}
          </div>
        </div>
      </div>

      {data.verdict === 'WAIT_FOR_PAYCYCLE' && data.goalAlternative && (
        <div className="mt-2 p-3.5 rounded-xl bg-blue-100/80 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 text-xs space-y-1">
          <span className="font-semibold block text-sm">🎯 {t('canIAfford.goalAlternativeTitle')}</span>
          <p>
            {t('canIAfford.goalAlternativeBody', {
              shortfall: data.goalAlternative.shortfallCovered,
              goalName: data.goalAlternative.goalName,
              delay: data.goalAlternative.delayDays,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
