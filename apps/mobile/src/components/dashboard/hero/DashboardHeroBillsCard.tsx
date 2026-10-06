import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface DashboardHeroBillsCardProps {
  readonly billsBalance: number;
  readonly billsMonthlyBudget: number;
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;
  readonly onBillsPress?: () => void;
  readonly onMoveMoney: () => void;
}

export const DashboardHeroBillsCard: React.FC<DashboardHeroBillsCardProps> = ({
  billsBalance,
  billsMonthlyBudget,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onBillsPress,
  onMoveMoney,
}) => {
  return (
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
          <Feather name="check-circle" size={14} color={DESIGN_TOKENS.colors.successDark} />
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
  );
};

const styles = StyleSheet.create({
  billsCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    shadowColor: DESIGN_TOKENS.colors.slate[900],
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
  sectionTag: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  billsBalance: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  shortfallAlert: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    borderRadius: DESIGN_TOKENS.radius.md,
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
    color: DESIGN_TOKENS.colors.criticalDark,
  },
  shortfallDetail: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.criticalDark,
    fontWeight: '500',
  },
  coverButton: {
    backgroundColor: DESIGN_TOKENS.colors.burnRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DESIGN_TOKENS.radius.default,
  },
  coverButtonText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontSize: 11,
    fontWeight: '800',
  },
  coveredAlert: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coveredText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  billsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 6,
  },
  billsCapLabel: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  billsCapValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
});
