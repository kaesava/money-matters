import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

interface AffordCheckBreakdownData {
  verdict: string;
  availableCash?: number | string;
  everydayRemaining?: number | string;
  safeCushion?: number | string;
  upcomingBillsBeforePayday?: number | string;
  shortfallToday?: number | string;
  shortfall?: number | string;
  goalDelays?: Array<{ goalName: string; delayDays: number }>;
  goalAlternative?: {
    goalName: string;
    shortfallCovered: number | string;
    delayDays: number;
  };
}

interface AffordCheckBreakdownCardProps {
  data: AffordCheckBreakdownData;
}

export function AffordCheckBreakdownCard({ data }: AffordCheckBreakdownCardProps) {
  return (
    <>
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownHeader}>Financial Details</Text>

        {data.availableCash !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Available Cash</Text>
            <Text style={styles.breakdownVal}>{formatAUD(data.availableCash)}</Text>
          </View>
        )}

        {data.everydayRemaining !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Everyday Remaining</Text>
            <Text style={styles.breakdownVal}>{formatAUD(data.everydayRemaining)}</Text>
          </View>
        )}

        {data.safeCushion !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Safe Buffer</Text>
            <Text style={styles.breakdownVal}>{formatAUD(data.safeCushion)}</Text>
          </View>
        )}

        {data.upcomingBillsBeforePayday !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Upcoming Ring-fenced Bills</Text>
            <Text style={styles.breakdownVal}>
              {formatAUD(data.upcomingBillsBeforePayday)}
            </Text>
          </View>
        )}

        {data.shortfallToday !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Shortfall Today</Text>
            <Text style={styles.breakdownValNegative}>
              -{formatAUD(data.shortfallToday)}
            </Text>
          </View>
        )}

        {data.shortfall !== undefined && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Estimated Shortfall</Text>
            <Text style={styles.breakdownValNegative}>
              -{formatAUD(data.shortfall)}
            </Text>
          </View>
        )}
      </View>

      {data.verdict === 'GOAL_DELAYED' && data.goalDelays && data.goalDelays.length > 0 && (
        <View style={styles.goalDelayCard}>
          <Feather name="alert-triangle" size={16} color={DESIGN_TOKENS.colors.warningDark} />
          <View style={styles.flex1}>
            <Text style={styles.goalDelayTitle}>Goal Impact</Text>
            <Text style={styles.goalDelayText}>
              This commitment delays {data.goalDelays.map((g) => `${g.goalName} (+${g.delayDays}d)`).join(', ')}.
            </Text>
          </View>
        </View>
      )}

      {data.verdict === 'WAIT_FOR_PAYCYCLE' && data.goalAlternative && (
        <View style={styles.goalDelayCard}>
          <Feather name="target" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
          <View style={styles.flex1}>
            <Text style={styles.goalDelayTitle}>Goal Alternative Available</Text>
            <Text style={styles.goalDelayText}>
              You could borrow {formatAUD(data.goalAlternative.shortfallCovered)} from {data.goalAlternative.goalName} (delays goal by {data.goalAlternative.delayDays} days).
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  breakdownCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 16,
    gap: 10,
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  breakdownValNegative: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  goalDelayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
    borderRadius: 14,
    padding: 12,
  },
  goalDelayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
  },
  goalDelayText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.warningDark,
    marginTop: 2,
  },
});
