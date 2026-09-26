import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../lib/format';

export interface DashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly daysUntilPayday?: number;
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;
  readonly needsAttentionCount: number;
  readonly behindCount: number;
  readonly onTrackCount: number;
  readonly onMoveMoney: () => void;
  readonly onReconcile: () => void;
  readonly onSelectFilter?: (health: string) => void;
  readonly onEverydayPress?: () => void;
  readonly onBillsPress?: () => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  daysUntilPayday,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  needsAttentionCount,
  behindCount,
  onTrackCount,
  onMoveMoney,
  onReconcile,
  onSelectFilter,
  onEverydayPress,
  onBillsPress,
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();

  const effectiveDays =
    daysUntilPayday !== undefined && daysUntilPayday > 0
      ? daysUntilPayday
      : Math.max(1, daysInMonth - currentDay);

  const dailySpendable = Math.max(0, everydayBalance / effectiveDays);
  const targetDailyBudget =
    everydayMonthlyBudget > 0 ? (everydayMonthlyBudget * 12) / 365 : 0;

  const isBillsRisk = billsShortfall > 0;
  const isPacingTight =
    !isBillsRisk && targetDailyBudget > 0 && dailySpendable < targetDailyBudget * 0.8;

  const progressPercent = Math.min(
    100,
    Math.max(5, (dailySpendable / (targetDailyBudget || 1)) * 100)
  );

  return (
    <View style={styles.container}>
      {/* 1. Everyday Spending Bento Hero */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onEverydayPress}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <Text style={styles.sectionTag}>
            {t('dashboard.hero.everydayDailyRateLabel')}
          </Text>

          {isBillsRisk ? (
            <View style={[styles.badgePill, styles.badgeRed]}>
              <Text style={[styles.badgeText, styles.badgeTextRed]}>
                {t('dashboard.hero.atRisk')}
              </Text>
            </View>
          ) : isPacingTight ? (
            <View style={[styles.badgePill, styles.badgeAmber]}>
              <Text style={[styles.badgeText, styles.badgeTextAmber]}>
                {t('dashboard.hero.pacingTightenedBadge')}
              </Text>
            </View>
          ) : (
            <View style={[styles.badgePill, styles.badgeGreen]}>
              <Text style={[styles.badgeText, styles.badgeTextGreen]}>
                {t('dashboard.hero.trackingOnTrack')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.heroAmount}>{formatAUD(dailySpendable)}</Text>
          <Text style={styles.perDayText}>/ day</Text>
        </View>

        <Text style={styles.pacingSubtitle}>
          {daysUntilPayday !== undefined && daysUntilPayday <= 0
            ? t('dashboard.hero.everydayPacingDaysLeftToday', {
                amount: formatAUD(everydayBalance),
              })
            : t('dashboard.hero.everydayPacingDaysLeft', {
                amount: formatAUD(everydayBalance),
                days: effectiveDays,
              })}
        </Text>

        {/* Progress Bar & Quick Balance Check */}
        <View style={styles.pacingFooter}>
          <View style={styles.pacingFooterMeta}>
            <Text style={styles.cycleAllowanceText}>
              {t('dashboard.hero.everydayAllowanceCycle', {
                amount: formatAUD(everydayMonthlyBudget),
              })}
            </Text>
            <TouchableOpacity onPress={onReconcile} activeOpacity={0.7}>
              <Text style={styles.reconcileText}>
                {t('dashboard.hero.reconcileQuickAction')} →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
                isBillsRisk
                  ? styles.fillRed
                  : isPacingTight
                  ? styles.fillAmber
                  : styles.fillGreen,
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* 2. Bills Pool Bento Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onBillsPress}
        style={styles.billsCard}
      >
        <View style={styles.billsTopRow}>
          <Text style={styles.sectionTag}>{t('poolTypes.bills')}</Text>
          <Text style={styles.billsBalance}>{formatAUD(billsBalance)}</Text>
        </View>

        {billsShortfall > 0 ? (
          <View style={styles.shortfallAlert}>
            <View style={styles.shortfallTextWrap}>
              <Text style={styles.shortfallTitle}>
                {t('dashboard.billsShortAmount', {
                  amount: formatAUD(billsShortfall),
                })}
              </Text>
              <Text style={styles.shortfallDetail}>
                {billsDue14DaysCount} bill(s) totaling {formatAUD(totalBillsDue14Days)} due in 14 days
              </Text>
            </View>
            <TouchableOpacity
              style={styles.coverButton}
              onPress={onMoveMoney}
              activeOpacity={0.8}
            >
              <Text style={styles.coverButtonText}>
                {t('dashboard.quickActions.moveMoney')} →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.coveredAlert}>
            <Feather name="check-circle" size={14} color="#15803D" />
            <Text style={styles.coveredText}>
              {t('dashboard.bills14DaysCovered')}
            </Text>
          </View>
        )}

        <View style={styles.billsFooter}>
          <Text style={styles.billsCapLabel}>Target Monthly Bills:</Text>
          <Text style={styles.billsCapValue}>{formatAUD(billsMonthlyBudget)}</Text>
        </View>
      </TouchableOpacity>

      {/* 3. Interactive Category Health Filter Strip */}
      <View style={styles.badgesRow}>
        <TouchableOpacity
          style={[styles.statusBadge, styles.redBadge]}
          onPress={() => onSelectFilter?.('RED')}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: '#E11D48' }]} />
          <Text style={[styles.statusText, { color: '#9F1239' }]}>
            {t('dashboard.upcoming.healthBehind')}
          </Text>
          <View style={[styles.countPill, { backgroundColor: '#FECDD3' }]}>
            <Text style={[styles.countText, { color: '#881337' }]}>{behindCount}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusBadge, styles.amberBadge]}
          onPress={() => onSelectFilter?.('AMBER')}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
          <Text style={[styles.statusText, { color: '#92400E' }]}>
            {t('dashboard.upcoming.healthNeedsAttention')}
          </Text>
          <View style={[styles.countPill, { backgroundColor: '#FDE68A' }]}>
            <Text style={[styles.countText, { color: '#78350F' }]}>
              {needsAttentionCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusBadge, styles.greenBadge]}
          onPress={() => onSelectFilter?.('GREEN')}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.statusText, { color: '#065F46' }]}>
            {t('dashboard.upcoming.healthOnTrack')}
          </Text>
          <View style={[styles.countPill, { backgroundColor: '#A7F3D0' }]}>
            <Text style={[styles.countText, { color: '#064E3B' }]}>{onTrackCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748B',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeRed: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextGreen: {
    color: '#065F46',
  },
  badgeTextAmber: {
    color: '#92400E',
  },
  badgeTextRed: {
    color: '#9F1239',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  perDayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  pacingSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  pacingFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  pacingFooterMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cycleAllowanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  reconcileText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fillGreen: {
    backgroundColor: '#22c55e',
  },
  fillAmber: {
    backgroundColor: '#F59E0B',
  },
  fillRed: {
    backgroundColor: '#ba1a1a',
  },
  billsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
    gap: 8,
  },
  billsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  billsBalance: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  shortfallAlert: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shortfallTextWrap: {
    flex: 1,
    gap: 2,
  },
  shortfallTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9F1239',
  },
  shortfallDetail: {
    fontSize: 10,
    color: '#BE123C',
    fontWeight: '500',
  },
  coverButton: {
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  coverButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  coveredAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coveredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  billsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 6,
  },
  billsCapLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  billsCapValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: DESIGN_TOKENS.radius.full,
    gap: 4,
    borderWidth: 1,
  },
  redBadge: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  amberBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  greenBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default DashboardHeroCard;
