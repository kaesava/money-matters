import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';
import type { GoalItem } from '../GoalsProgressStrip';
import { calculateGoalPacing } from './goal-pacing';

interface GoalProgressStripCardProps {
  readonly item: GoalItem;
  readonly nowTime: number;
}

export const GoalProgressStripCard: React.FC<GoalProgressStripCardProps> = ({
  item,
  nowTime,
}) => {
  const router = useRouter();
  const {
    bal,
    target,
    fundedPct,
    timeElapsedPct,
    isOverdue,
    isCompleted,
    isLagging,
    isOnTrack,
    barColor,
  } = calculateGoalPacing(item, nowTime);

  const isOngoing = item.goalMode === 'ONGOING';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/(app)/envelopes/${item.id}` as Href)}
      style={styles.goalCard}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.goalName, { flex: 1 }]} numberOfLines={1}>
          {item.name}
        </Text>
        {isOngoing && (
          <View style={styles.ongoingBadge}>
            <Text style={styles.ongoingBadgeText}>
              {t('dashboard.goals.ongoingPill')}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.savedLabel}>{t('dashboard.goals.savedLabel')}</Text>
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
            {timeElapsedPct !== null && (
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
              {t('dashboard.goals.targetAmount', { amount: formatAUD(target) })}
            </Text>
          </View>

          <View style={styles.statusMeta}>
            {isCompleted ? (
              <Text style={[styles.pacingText, styles.textGreen]}>
                ✓ {t('dashboard.goals.reached')}
              </Text>
            ) : isOverdue ? (
              <Text style={styles.overdueText}>
                ⚠️ {t('dashboard.goals.targetPassed')}
              </Text>
            ) : isLagging ? (
              <Text style={[styles.pacingText, styles.textRed]}>
                {t('dashboard.goals.behindSchedule')}
              </Text>
            ) : isOnTrack ? (
              <Text style={[styles.pacingText, styles.textGreen]}>
                {t('dashboard.goals.onSchedule')}
              </Text>
            ) : (
              <Text style={[styles.pacingText, styles.textAmber]}>
                {t('dashboard.goals.slightlyBehind')}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.noTargetText}>
          {t('dashboard.goals.noTargetDate')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  goalCard: {
    width: 170,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 12,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 4,
  },
  ongoingBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  ongoingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
  },
  savedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
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
