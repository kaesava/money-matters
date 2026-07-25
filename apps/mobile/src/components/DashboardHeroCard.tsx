import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { formatAUD } from '../lib/format';

export interface DashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly atRiskCount: number;
  readonly missedCount: number;
  readonly nextPayday?: {
    readonly id: string;
    readonly name: string;
    readonly amount: number;
    readonly expectedDate: string;
  } | null;
  readonly onPressNextPay: (eventId: string) => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  everydayBalance,
  atRiskCount,
  missedCount,
  nextPayday,
  onPressNextPay,
}) => {
  const statusColor = missedCount > 0
    ? DESIGN_TOKENS.colors.critical
    : atRiskCount > 0
    ? DESIGN_TOKENS.colors.warning
    : DESIGN_TOKENS.colors.success;

  const statusText = missedCount > 0
    ? `${missedCount} Missed`
    : atRiskCount > 0
    ? `${atRiskCount} At Risk`
    : 'On Track';

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

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Everyday Balance</Text>
          <Text style={styles.balance}>{formatAUD(everydayBalance)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
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
            <View>
              <Text style={styles.payTitle}>Next Pay: {nextPayday.name}</Text>
              <Text style={styles.paySub}>
                {formatAUD(nextPayday.amount)} • {daysAwayText} ({nextPayday.expectedDate})
              </Text>
            </View>
          </View>
          <View style={styles.payActionBtn}>
            <Text style={styles.payActionText}>Process Pay</Text>
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
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 4,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.border,
    marginVertical: DESIGN_TOKENS.spacing.stackGap,
  },
  paydayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paydayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.stackGap,
    flex: 1,
  },
  payIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  paySub: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  payActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
});

export default DashboardHeroCard;
