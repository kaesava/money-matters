import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../../lib/format';

interface DashboardHeroEverydayCardProps {
  readonly everydayBalance: number;
  readonly safeToSpend?: number;
  readonly everydayMonthlyBudget: number;
  readonly safetyBufferFloor?: number;
  readonly dailySpendable?: number;
  readonly effectiveDays: number;
  readonly daysUntilPayday?: number;
  readonly progressPercent?: number;
  readonly isBillsRisk?: boolean;
  readonly isPacingTight?: boolean;
  readonly isAwaitingFirstPayday?: boolean;
  readonly onEverydayPress?: () => void;
  readonly onAlignBalance?: () => void;
}

export const DashboardHeroEverydayCard: React.FC<DashboardHeroEverydayCardProps> = ({
  everydayBalance,
  safeToSpend,
  everydayMonthlyBudget,
  safetyBufferFloor = 0,
  effectiveDays,
  daysUntilPayday,
  isBillsRisk = false,
  isAwaitingFirstPayday = false,
  onEverydayPress,
  onAlignBalance,
}) => {
  return (
    <TouchableOpacity
      testID="tour-envelopes-row"
      activeOpacity={0.9}
      onPress={onEverydayPress}
      style={styles.heroCard}
    >
      <View style={styles.heroTopRow}>
        <Text style={styles.sectionTag}>
          {t('dashboard.hero.everydayEnvelopeTitle')}
        </Text>

        {isAwaitingFirstPayday ? (
          <View style={[styles.badgePill, styles.badgeBlue]}>
            <Text style={[styles.badgeText, styles.badgeTextBlue]}>
              {t('dashboard.hero.firstPaydayPendingBadge')}
            </Text>
          </View>
        ) : isBillsRisk ? (
          <View style={[styles.badgePill, styles.badgeRed]}>
            <Text style={[styles.badgeText, styles.badgeTextRed]}>
              {t('dashboard.hero.atRisk')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metricRow}>
        <View>
          <Text style={styles.heroAmount}>{formatMobileCurrency(safeToSpend !== undefined ? safeToSpend : everydayBalance)}</Text>
          <Text style={styles.safeToSpendSub}>{t('dashboard.hero.safeToSpendLabel')}</Text>
        </View>
        {onAlignBalance && (
          <TouchableOpacity
            testID="tour-bank-accounts"
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
        {daysUntilPayday !== undefined && daysUntilPayday <= 0
          ? t('dashboard.hero.estRemainingToday', {
              amount: formatMobileCurrency(everydayBalance),
            })
          : t('dashboard.hero.estRemaining', {
              amount: formatMobileCurrency(everydayBalance),
              days: effectiveDays,
            })
        }
      </Text>

      {/* Target Allowance & Buffer Protection */}
      <View style={styles.pacingFooter}>
        <View style={styles.pacingFooterMeta}>
          {everydayMonthlyBudget > 0 ? (
            <Text style={styles.cycleAllowanceText}>
              {t('dashboard.hero.everydayAllowanceCycle', {
                amount: formatMobileCurrency(everydayMonthlyBudget),
              })}
            </Text>
          ) : (
            <View />
          )}
          {safetyBufferFloor > 0 && (
            <Text style={styles.bufferProtectedText}>
              🛡️ {t('dashboard.hero.bufferProtected', { amount: formatMobileCurrency(safetyBufferFloor) })}
            </Text>
          )}
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
  badgeRed: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextRed: {
    color: DESIGN_TOKENS.colors.criticalDark,
  },
  badgeTextBlue: {
    color: DESIGN_TOKENS.colors.accent,
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
  safeToSpendSub: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
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
});
