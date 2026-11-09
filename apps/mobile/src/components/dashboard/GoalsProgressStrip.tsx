import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../lib/format';

export interface GoalItem {
  id: string;
  name: string;
  currentBalance: number | string;
  targetAmount?: string | number | null;
  targetDate?: string | null;
  goalMode?: 'TARGET_DATE' | 'ONGOING' | string | null;
  enteredAmount?: string | null;
  budgetFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | string | null;
  progressPercentage?: number;
  healthStatus?: 'GREEN' | 'AMBER' | 'RED';
  createdAt?: string | Date | null;
}

export interface GoalsProgressStripProps {
  goals: GoalItem[];
}

export function GoalsProgressStrip({ goals }: GoalsProgressStripProps) {
  const router = useRouter();

  const totalGoals = goals?.length ?? 0;

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

    for (const g of goals ?? []) {
      const bal = typeof g.currentBalance === 'number' ? g.currentBalance : parseFloat(String(g.currentBalance || '0')) || 0;
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
        const tgt = parseFloat(String(g.targetAmount || '0')) || 0;
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
  }, [goals]);

  if (totalGoals === 0) return null;

  const allOnTrack = onTrackGoals === totalGoals;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{t('dashboard.goals.cardTitle')}</Text>
          <View
            style={[
              styles.badge,
              allOnTrack ? styles.badgeSuccess : styles.badgeAmber,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                allOnTrack ? styles.badgeSuccessText : styles.badgeAmberText,
              ]}
            >
              {allOnTrack
                ? t('dashboard.goals.allOnTrack', { total: totalGoals })
                : t('dashboard.goals.onTrack', {
                    count: onTrackGoals,
                    total: totalGoals,
                  })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(app)/envelopes' as Href)}
          style={styles.seeAllBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllText}>{t('dashboard.goals.viewAll')}</Text>
          <Feather name="chevron-right" size={14} color={DESIGN_TOKENS.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Hero Metric */}
      <View style={styles.heroSection}>
        <Text style={styles.heroSubtitle}>{t('dashboard.goals.totalSavedInvested')}</Text>
        <Text style={styles.heroAmount}>{formatMobileCurrency(totalAccumulatedSavings)}</Text>
      </View>

      {/* Target Milestone Progress */}
      {targetDateGoalsCount > 0 && (
        <View style={styles.milestoneSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.milestoneTitle}>{t('dashboard.goals.title')}</Text>
            <Text style={styles.milestoneMetric}>
              {t('dashboard.goals.milestonesFunded', {
                funded: formatMobileCurrency(totalMilestoneBalance),
                target: formatMobileCurrency(totalMilestoneTarget),
                percent: milestonePct,
              })}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${milestonePct}%` }]} />
          </View>
        </View>
      )}

      {/* Recurring Ongoing Pace */}
      {recurringGoalsCount > 0 && (
        <View style={styles.recurringRow}>
          <Text style={styles.recurringLabel}>{t('dashboard.goals.ongoingPill')}</Text>
          <View style={styles.recurringBadge}>
            <Text style={styles.recurringAmount}>
              {t('dashboard.goals.recurringPace', {
                amount: formatMobileCurrency(monthlyRecurringPace),
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Footer Breakdown */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {t('dashboard.goals.goalBreakdown', {
            total: totalGoals,
            targetCount: targetDateGoalsCount,
            recurringCount: recurringGoalsCount,
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  badgeSuccessText: {
    color: '#15803D',
  },
  badgeAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeAmberText: {
    color: '#B45309',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  heroSection: {
    paddingVertical: 2,
    gap: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  milestoneSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  milestoneMetric: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 4,
  },
  recurringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  recurringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  recurringBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurringAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: DESIGN_TOKENS.fonts.mono,
  },
  footerRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[400],
  },
});

export default GoalsProgressStrip;
