import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';
import type { GoalItem } from '../GoalsProgressStrip';

interface GoalProgressStripCardProps {
  readonly item: GoalItem;
  readonly nowTime: number;
}

export const GoalProgressStripCard: React.FC<GoalProgressStripCardProps> = ({
  item,
  nowTime,
}) => {
  const router = useRouter();
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

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(app)/pools/${item.id}` as never)}
      style={styles.goalCard}
    >
      <Text style={styles.goalName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.goalBalance}>{formatAUD(bal)}</Text>

      {target > 0 ? (
        <View style={styles.progressSection}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${fundedPct}%`, backgroundColor: barColor },
              ]}
            />
            {timeElapsedPct !== null &&
              timeElapsedPct > 0 &&
              timeElapsedPct < 100 && (
                <View
                  style={[
                    styles.needleIndicator,
                    { left: `${timeElapsedPct}%` },
                  ]}
                />
              )}
          </View>

          <View style={styles.progressMeta}>
            <Text style={styles.progressPct}>
              {t('dashboard.goals.funded', { percent: fundedPct })}
            </Text>
            <Text style={styles.targetAmount}>
              {formatAUD(target)}
            </Text>
          </View>

          <View style={styles.statusMeta}>
            {isOverdue ? (
              <Text style={styles.overdueText}>
                {t('common.overdue')}
              </Text>
            ) : timeElapsedPct !== null ? (
              <Text
                style={[
                  styles.pacingText,
                  isOnTrack
                    ? styles.textGreen
                    : isJustBehind
                    ? styles.textAmber
                    : styles.textRed,
                ]}
              >
                {isOnTrack
                  ? t('dashboard.goals.onTrackBadge')
                  : isJustBehind
                  ? t('dashboard.goals.justBehind')
                  : t('dashboard.goals.lagging')}{' '}
                {t('dashboard.goals.pace', { percent: timeElapsedPct })}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.noTargetText}>{t('common.optional')}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  goalCard: {
    width: 175,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 13,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 2,
  },
  goalBalance: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.accent,
    marginBottom: 6,
  },
  progressSection: {
    gap: 4,
  },
  progressBarTrack: {
    position: 'relative',
    height: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 3,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  needleIndicator: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: DESIGN_TOKENS.colors.slate[800],
    borderRadius: 1,
    marginLeft: -1,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  targetAmount: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
    fontFamily: 'monospace',
  },
  statusMeta: {
    marginTop: 1,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  pacingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textGreen: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  textAmber: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  textRed: {
    color: DESIGN_TOKENS.colors.burnRed,
  },
  noTargetText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    fontStyle: 'italic',
  },
});
