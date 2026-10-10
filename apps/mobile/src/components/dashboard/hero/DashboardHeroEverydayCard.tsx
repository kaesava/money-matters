import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface DashboardHeroEverydayCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget: number;
  readonly safetyBufferFloor?: number;
  readonly dailySpendable: number;
  readonly effectiveDays: number;
  readonly daysUntilPayday?: number;
  readonly progressPercent: number;
  readonly isBillsRisk: boolean;
  readonly isPacingTight: boolean;
  readonly onEverydayPress?: () => void;
  readonly onAlignBalance?: () => void;
}

export const DashboardHeroEverydayCard: React.FC<DashboardHeroEverydayCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget,
  safetyBufferFloor = 0,
  dailySpendable,
  effectiveDays,
  daysUntilPayday,
  progressPercent,
  isBillsRisk,
  isPacingTight,
  onEverydayPress,
  onAlignBalance,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onEverydayPress}
      style={styles.heroCard}
    >
      <View style={styles.heroTopRow}>
        <Text style={styles.sectionTag}>
          {t('dashboard.hero.everydayEnvelopeTitle')}
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
        <Text style={styles.heroAmount}>{formatAUD(everydayBalance)}</Text>
        {onAlignBalance && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAlignBalance}
            style={styles.alignButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.alignButtonText}>{t('dashboard.hero.alignBalance')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.pacingSubtitle}>
        {t('dashboard.hero.safeToSpendLabel')} · {t('dashboard.hero.dailyPaceSubtext', { amount: formatAUD(dailySpendable) })} · {
          daysUntilPayday !== undefined && daysUntilPayday <= 0
            ? t('dashboard.hero.estRemainingToday', {
                amount: formatAUD(everydayBalance),
              })
            : t('dashboard.hero.estRemaining', {
                amount: formatAUD(everydayBalance),
                days: effectiveDays,
              })
        }
      </Text>

      {/* Progress Bar & Buffer Protection */}
      <View style={styles.pacingFooter}>
        <View style={styles.pacingFooterMeta}>
          <Text style={styles.cycleAllowanceText}>
            {t('dashboard.hero.everydayAllowanceCycle', {
              amount: formatAUD(everydayMonthlyBudget),
            })}
          </Text>
          {safetyBufferFloor > 0 && (
            <Text style={styles.bufferProtectedText}>
              🛡️ {t('dashboard.hero.bufferProtected', { amount: formatAUD(safetyBufferFloor) })}
            </Text>
          )}
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
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    shadowColor: DESIGN_TOKENS.colors.slate[900],
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
    color: DESIGN_TOKENS.colors.textMuted,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  badgeAmber: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  badgeRed: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextGreen: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  badgeTextAmber: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  badgeTextRed: {
    color: DESIGN_TOKENS.colors.criticalDark,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  alignButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  alignButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  perDayText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  pacingSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 1,
  },
  pacingFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
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
    color: DESIGN_TOKENS.colors.textMuted,
  },
  bufferProtectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fillGreen: {
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
  fillAmber: {
    backgroundColor: DESIGN_TOKENS.colors.warning,
  },
  fillRed: {
    backgroundColor: DESIGN_TOKENS.colors.critical,
  },
});
