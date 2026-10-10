import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface CommandPanelSurplusGaugeProps {
  sweepPoolName: string;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  numericActual: number;
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
  billsPercent: number;
  goalsPercent: number;
  surplusPercent: number;
  onResetEdits?: () => void;
  isReadOnly?: boolean;
}

export const CommandPanelSurplusGauge: React.FC<CommandPanelSurplusGaugeProps> = ({
  sweepPoolName,
  sweepPoolRemainder,
  isDeficit,
  numericActual,
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  billsPercent,
  goalsPercent,
  surplusPercent,
  onResetEdits,
  isReadOnly = false,
}) => {
  return (
    <View style={[styles.card, isDeficit ? styles.deficitCard : styles.surplusCard]}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>
          {isDeficit ? t('paydayDrawer.deficitTitle') : t('paydayDrawer.safeToSpendRemaining')}
        </Text>
        <View style={styles.sweepBadge}>
          <Text style={styles.sweepBadgeText}>{sweepPoolName}</Text>
        </View>
      </View>

      <View style={styles.gaugeAmountWrap}>
        <Text style={[styles.gaugeAmountText, isDeficit ? styles.deficitAmount : styles.surplusAmount]}>
          {formatAUD(sweepPoolRemainder)}
        </Text>
        <Text style={styles.gaugeSubtext}>
          {isDeficit
            ? t('paydayDrawer.deficitExplicitWarning', {
                amount: formatAUD(Math.abs(sweepPoolRemainder)),
                incomeAmount: formatAUD(numericActual),
              })
            : t('paydayDrawer.surplusWillGoInto', {
                amount: formatAUD(Math.max(0, sweepPoolRemainder)),
                name: sweepPoolName,
              })}
        </Text>
      </View>

      {isDeficit && (
        <View style={styles.deficitAlertBox}>
          <View style={styles.deficitAlertContent}>
            <Feather name="alert-triangle" size={14} color={DESIGN_TOKENS.colors.burnRed} />
            <Text style={styles.deficitAlertText}>
              {t('paydayDrawer.deficitAlert', {
                amount: formatAUD(Math.abs(sweepPoolRemainder)),
                incomeAmount: formatAUD(numericActual),
              })}
            </Text>
          </View>
          {onResetEdits && !isReadOnly && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onResetEdits}
              style={styles.resetEditsBtn}
            >
              <Text style={styles.resetEditsBtnText}>{t('paydayDrawer.resetEdits')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.proportionSection}>
        <View style={styles.proportionBar}>
          <View style={[styles.barSegment, { width: `${billsPercent}%`, backgroundColor: DESIGN_TOKENS.colors.accent }]} />
          <View style={[styles.barSegment, { width: `${goalsPercent}%`, backgroundColor: DESIGN_TOKENS.colors.primary }]} />
          <View style={[styles.barSegment, { width: `${surplusPercent}%`, backgroundColor: DESIGN_TOKENS.colors.success }]} />
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DESIGN_TOKENS.colors.accent }]} />
            <Text style={styles.legendText}>
              {t('paydayDrawer.bills')} {formatAUD(billsAllocated)}
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DESIGN_TOKENS.colors.primary }]} />
            <Text style={styles.legendText}>
              {t('paydayDrawer.goals')} {formatAUD(goalsAllocated)}
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DESIGN_TOKENS.colors.success }]} />
            <Text style={styles.legendText}>
              {t('paydayDrawer.surplus')} {formatAUD(Math.max(0, sweepPoolRemainder))}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  surplusCard: {
    padding: 16,
    gap: 12,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  deficitCard: {
    padding: 16,
    gap: 12,
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sweepBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sweepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  gaugeAmountWrap: {
    gap: 2,
  },
  gaugeAmountText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  surplusAmount: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  deficitAmount: {
    color: DESIGN_TOKENS.colors.criticalDark,
  },
  gaugeSubtext: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  deficitAlertBox: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  deficitAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deficitAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.criticalDark,
    flex: 1,
  },
  resetEditsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: DESIGN_TOKENS.colors.criticalDark,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resetEditsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proportionSection: {
    gap: 8,
    paddingTop: 4,
  },
  proportionBar: {
    height: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});
