import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import type { GoalItem } from '../GoalsProgressStrip';

export interface GoalPacingCalculation {
  bal: number;
  target: number;
  fundedPct: number;
  timeElapsedPct: number | null;
  isOverdue: boolean;
  isCompleted: boolean;
  isLagging: boolean;
  isJustBehind: boolean;
  isOnTrack: boolean;
  barColor: string;
}

export function calculateGoalPacing(
  item: GoalItem,
  nowTime: number
): GoalPacingCalculation {
  const bal =
    typeof item.currentBalance === 'number'
      ? item.currentBalance
      : parseFloat(String(item.currentBalance || '0'));
  const target = item.targetAmount
    ? parseFloat(String(item.targetAmount))
    : 0;
  const fundedPct =
    target > 0 ? Math.min(100, Math.round((bal / target) * 100)) : 0;

  let timeElapsedPct: number | null = null;
  let isOverdue = false;

  if (item.targetDate) {
    const targetTime = new Date(item.targetDate).getTime();
    const createdTime = item.createdAt
      ? new Date(item.createdAt).getTime()
      : targetTime - 90 * 24 * 60 * 60 * 1000;
    const totalDuration = Math.max(1, targetTime - createdTime);
    const elapsedDuration = Math.max(0, nowTime - createdTime);
    timeElapsedPct = Math.min(
      100,
      Math.max(0, Math.round((elapsedDuration / totalDuration) * 100))
    );
    isOverdue = nowTime > targetTime && fundedPct < 100;
  }

  const isCompleted = fundedPct >= 100;
  const isLagging =
    timeElapsedPct !== null && fundedPct < timeElapsedPct * 0.8;
  const isJustBehind =
    timeElapsedPct !== null &&
    fundedPct < timeElapsedPct &&
    !isLagging;
  const isOnTrack =
    timeElapsedPct !== null
      ? fundedPct >= timeElapsedPct
      : fundedPct >= 50;

  const barColor = isCompleted
    ? DESIGN_TOKENS.colors.success
    : isOverdue || isLagging
    ? DESIGN_TOKENS.colors.burnRed
    : isJustBehind
    ? DESIGN_TOKENS.colors.warning
    : isOnTrack
    ? DESIGN_TOKENS.colors.success
    : DESIGN_TOKENS.colors.accent;

  return {
    bal,
    target,
    fundedPct,
    timeElapsedPct,
    isOverdue,
    isCompleted,
    isLagging,
    isJustBehind,
    isOnTrack,
    barColor,
  };
}
