import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, monthProgress } from '@money-matters/ui';
import { CanAffordVerdictType } from '@money-matters/types';
import { formatAUD } from '../lib/format';
import { MobileDonutRing } from './MobileDonutRing';
import { CanAffordCard } from './CanAffordCard';


export interface DashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly needsAttentionCount: number;
  readonly behindCount: number;
  readonly onTrackCount: number;
  readonly canAffordAmount: string;
  readonly setCanAffordAmount: (amt: string) => void;
  readonly canAffordData?: CanAffordVerdictType | null;
  readonly nextPayday?: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
  readonly onSelectFilter?: (health: string) => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  needsAttentionCount,
  behindCount,
  onTrackCount,
  canAffordAmount,
  setCanAffordAmount,
  canAffordData,
  nextPayday,
  onPressNextPay,
  onSelectFilter,
}) => {
  let daysAwayText = '';
  if (nextPayday?.expectedDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payDate = new Date(nextPayday.expectedDate);
    payDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      daysAwayText = 'Due today!';
    } else if (diffDays > 0) {
      daysAwayText = `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
    } else {
      daysAwayText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
    }
  }

  const { elapsedPct } = monthProgress();
  const consumedPct =
    everydayMonthlyBudget > 0
      ? Math.min(100, Math.max(0, Math.round(((everydayMonthlyBudget - everydayBalance) / everydayMonthlyBudget) * 100)))
      : 0;

  return (
    <View style={styles.card}>
      {/* Top Section: Everyday Balance + Integrated Can We Afford This Widget */}
      <View style={styles.topSection}>
        <View style={styles.heroRow}>
          <MobileDonutRing
            timeElapsedPct={elapsedPct}
            consumedPct={consumedPct}
            centerLabel={formatAUD(everydayBalance)}
            subLabel="Everyday Balance"
            size={120}
            strokeWidth={9}
          />
          <View style={styles.balanceContainer}>
            {/* 3 Premium Interactive Category Health Badges */}
            <View style={styles.badgesColumn}>
              {/* Behind Badge */}
              <TouchableOpacity
                style={[styles.statusBadge, styles.redBadge]}
                onPress={() => onSelectFilter?.('RED')}
                activeOpacity={0.7}
              >
                <View style={[styles.statusDot, { backgroundColor: '#E11D48' }]} />
                <Text style={[styles.statusText, { color: '#9F1239' }]} numberOfLines={1}>
                  Behind
                </Text>
                <View style={[styles.countPill, { backgroundColor: '#FECDD3' }]}>
                  <Text style={[styles.countText, { color: '#881337' }]}>{behindCount}</Text>
                </View>
              </TouchableOpacity>

              {/* Needs Attention Badge */}
              <TouchableOpacity
                style={[styles.statusBadge, styles.amberBadge]}
                onPress={() => onSelectFilter?.('AMBER')}
                activeOpacity={0.7}
              >
                <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
                <Text style={[styles.statusText, { color: '#92400E' }]} numberOfLines={1}>
                  Attention
                </Text>
                <View style={[styles.countPill, { backgroundColor: '#FDE68A' }]}>
                  <Text style={[styles.countText, { color: '#78350F' }]}>{needsAttentionCount}</Text>
                </View>
              </TouchableOpacity>

              {/* On Track Badge */}
              <TouchableOpacity
                style={[styles.statusBadge, styles.greenBadge]}
                onPress={() => onSelectFilter?.('GREEN')}
                activeOpacity={0.7}
              >
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statusText, { color: '#065F46' }]} numberOfLines={1}>
                  On Track
                </Text>
                <View style={[styles.countPill, { backgroundColor: '#A7F3D0' }]}>
                  <Text style={[styles.countText, { color: '#064E3B' }]}>{onTrackCount}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Can We Afford This Widget inline in top section */}
        <View style={styles.affordBox}>
          <Text style={styles.affordTitle}>Can We Afford This?</Text>
          <CanAffordCard
            canAffordAmount={canAffordAmount}
            setCanAffordAmount={setCanAffordAmount}
            canAffordData={canAffordData}
          />
        </View>
      </View>

      <View style={styles.divider} />


      {nextPayday ? (
        <TouchableOpacity
          style={styles.paydayRow}
          onPress={() => onPressNextPay(nextPayday.id)}
          activeOpacity={0.7}
        >
          <View style={styles.paydayLeft}>
            <View style={styles.payIconBg}>
              <Feather name="dollar-sign" size={16} color={DESIGN_TOKENS.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle} numberOfLines={1}>Next Pay: {nextPayday.name}</Text>
              <Text style={styles.paySub} numberOfLines={1}>
                {formatAUD(nextPayday.amount)} • {daysAwayText} ({nextPayday.expectedDate})
              </Text>
            </View>
          </View>
          <View style={styles.payActionBtn}>
            <Text style={styles.payActionText}>Process</Text>
            <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.primary} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.paydayRow}>
          <Text style={styles.paySub}>No upcoming payday scheduled</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  topSection: {
    flexDirection: 'column',
    gap: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balance: {
    fontSize: 32,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  badgesColumn: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: DESIGN_TOKENS.radius.full,
    gap: 4,
    borderWidth: 1,
    flexShrink: 1,
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
  affordBox: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  affordTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  affordInput: {
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textPrimary,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  verdictBox: {
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
  },
  yesBox: {
    backgroundColor: '#F0FDF4',
  },
  impactBox: {
    backgroundColor: '#FFFBEB',
  },
  noBox: {
    backgroundColor: '#FEF2F2',
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '700',
  },
  yesText: {
    color: '#166534',
  },
  impactText: {
    color: '#92400E',
  },
  noText: {
    color: '#991B1B',
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.border,
    marginVertical: 12,
  },
  paydayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paydayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  payIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  paySub: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 1,
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  payActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
});

export default DashboardHeroCard;
