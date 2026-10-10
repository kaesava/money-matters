import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from './index.js';
import { t } from '@money-matters/i18n';
import type { GoalDelayImpact } from '@money-matters/types';

export interface GoalDelayCardProps {
  goalDelays: GoalDelayImpact[];
}

export function GoalDelayCard({ goalDelays }: GoalDelayCardProps) {
  if (!goalDelays || goalDelays.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="calendar" size={16} color={DESIGN_TOKENS.colors.warningDark} />
        <Text style={styles.headerTitle}>
          {t('canIAfford.impactedGoalsTitle', { count: goalDelays.length })}
        </Text>
      </View>

      <View style={styles.list}>
        {goalDelays.map((goal) => (
          <View key={goal.goalId} style={styles.goalCard}>
            <View style={styles.goalTopRow}>
              <View style={styles.goalNameBadgeRow}>
                <Text style={styles.goalName} numberOfLines={1}>
                  {goal.goalName}
                </Text>
                {goal.isCommitted ? (
                  <View style={styles.committedBadge}>
                    <Feather name="shield" size={10} color={DESIGN_TOKENS.colors.warningDark} />
                    <Text style={styles.committedBadgeText}>
                      {t('canIAfford.goalDelayedCommittedBadge')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.optionalBadge}>
                    <Feather name="star" size={10} color={DESIGN_TOKENS.colors.slate[500]} />
                    <Text style={styles.optionalBadgeText}>
                      {t('canIAfford.goalDelayedOptionalBadge')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.delayDaysText}>
                {t('canIAfford.goalDelayedBy', { days: goal.delayDays })}
              </Text>
            </View>

            <View style={styles.datesGrid}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateLabel}>{t('canIAfford.goalOriginalDate')}</Text>
                <Text style={styles.dateValue}>
                  {goal.originalTargetDate ?? t('canIAfford.notApplicable')}
                </Text>
              </View>
              <View style={[styles.dateBlock, styles.dateBlockDelayed]}>
                <Text style={styles.dateLabelDelayed}>{t('canIAfford.goalNewDate')}</Text>
                <Text style={styles.dateValueDelayed}>
                  {goal.newTargetDate ?? t('canIAfford.notApplicable')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  list: {
    gap: 8,
  },
  goalCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    gap: 10,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  goalNameBadgeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  committedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
  },
  committedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  optionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  delayDaysText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
    fontFamily: 'monospace',
  },
  datesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dateBlock: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  dateBlockDelayed: {
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  dateLabel: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[500],
    marginBottom: 2,
  },
  dateLabelDelayed: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.warningDark,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[800],
    fontFamily: 'monospace',
  },
  dateValueDelayed: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
    fontFamily: 'monospace',
  },
});
