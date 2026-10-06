import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';
import type { MobilePaydayAllocationRecord } from '../MobilePaydayAllocationDetailModal';

interface AllocationDetailLinesListProps {
  lines: MobilePaydayAllocationRecord['lines'];
}

export const AllocationDetailLinesList: React.FC<AllocationDetailLinesListProps> = ({ lines }) => {
  const nonZeroLines = lines.filter(
    (line) => parseFloat(line.confirmedAmount || line.proposedAmount || '0') > 0.001
  );

  return (
    <View style={styles.linesSection}>
      <Text style={styles.sectionHeader}>
        {t('paydayDrawer.splitBreakdown', { count: nonZeroLines.length })}
      </Text>
      {nonZeroLines.map((line, idx) => {
        const amt = parseFloat(line.confirmedAmount || line.proposedAmount || '0');
        return (
          <View key={line.id || idx} style={styles.lineItem}>
            <View style={styles.flex1}>
              <Text style={styles.poolName}>
                {line.poolName || t('paydayDrawer.poolAllocationDefault')}
              </Text>
              {line.reasoning ? (
                <Text style={styles.lineReasoning}>{line.reasoning}</Text>
              ) : null}
            </View>
            <Text style={styles.lineAmount}>{formatAUD(amt)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  linesSection: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    padding: 12,
  },
  poolName: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  lineReasoning: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  lineAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
});
