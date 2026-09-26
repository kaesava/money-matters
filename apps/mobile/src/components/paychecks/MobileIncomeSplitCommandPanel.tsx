import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';

export interface MobileIncomeSplitCommandPanelProps {
  sourceName: string;
  onSourceNameChange: (name: string) => void;
  actualAmount: string;
  onActualAmountChange: (amount: string) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  numericActual: number;
  sweepPoolName: string;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
  isReadOnly: boolean;
  isAmountModified: boolean;
  onRecalculateWaterfall?: () => void;
  submitting?: boolean;
  isConfirmedPlan?: boolean;
}

export function MobileIncomeSplitCommandPanel({
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  numericActual,
  sweepPoolName,
  sweepPoolRemainder,
  isDeficit,
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  isReadOnly,
  isAmountModified,
  onRecalculateWaterfall,
  submitting,
  isConfirmedPlan = false,
}: MobileIncomeSplitCommandPanelProps) {
  const [detailsCollapsed, setDetailsCollapsed] = useState(!isConfirmedPlan);

  const billsPercent = numericActual > 0 ? Math.min(100, (billsAllocated / numericActual) * 100) : 0;
  const goalsPercent = numericActual > 0 ? Math.min(100 - billsPercent, (goalsAllocated / numericActual) * 100) : 0;
  const surplusPercent = numericActual > 0 ? Math.max(0, (sweepPoolRemainder / numericActual) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* 1. Collapsible Paycheck Details Card */}
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => setDetailsCollapsed((prev) => !prev)}
          style={styles.cardHeaderToggle}
          activeOpacity={0.7}
        >
          <View style={styles.toggleTitleRow}>
            <Feather
              name={detailsCollapsed ? 'chevron-right' : 'chevron-down'}
              size={16}
              color="#64748B"
            />
            <Text style={styles.toggleTitleText}>
              {t('paydayDrawer.reviewIncome')} • {formatDate(selectedDate)}
            </Text>
          </View>
          <Text style={styles.toggleAmountText}>{formatAUD(numericActual)}</Text>
        </TouchableOpacity>

        {!detailsCollapsed && (
          <View style={styles.detailsBody}>
            <MobileInput
              label={t('paydayDrawer.incomeSourceLabel')}
              required
              value={sourceName}
              editable={!isReadOnly}
              onChangeText={onSourceNameChange}
            />

            <AmountInput
              label={t('paydayDrawer.incomeAmountLabel')}
              required
              value={actualAmount}
              editable={!isReadOnly}
              onChangeText={onActualAmountChange}
            />

            <MobileDatePickerField
              label={t('paydayDrawer.incomeDate')}
              required
              value={selectedDate}
              disabled={isReadOnly}
              onChange={onSelectedDateChange}
            />

            {isAmountModified && onRecalculateWaterfall && !isReadOnly && (
              <View style={styles.amountModifiedNotice}>
                <Text style={styles.amountModifiedText}>
                  {t('paydayDrawer.amountChangedPrompt')}
                </Text>
                <TouchableOpacity
                  onPress={onRecalculateWaterfall}
                  disabled={submitting}
                  style={styles.reRunWaterfallBtn}
                >
                  <Text style={styles.reRunWaterfallBtnText}>
                    {t('paydayDrawer.reRunWaterfall')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 2. Live Safe-to-Spend / Surplus Gauge Card */}
      {!isConfirmedPlan && (
        <View style={[styles.card, isDeficit ? styles.deficitCard : styles.surplusCard]}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>
              {t('paydayDrawer.safeToSpendRemaining')}
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
                ? t('paydayDrawer.activeDeficitWarning')
                : t('paydayDrawer.totalSafeToSpendAllocated', { amount: formatAUD(everydayAllocated) })}
            </Text>
          </View>

          {/* Deficit Alert Warning Banner */}
          {isDeficit && (
            <View style={styles.deficitAlertBox}>
              <Feather name="alert-triangle" size={14} color="#B91C1C" />
              <Text style={styles.deficitAlertText}>
                {t('paydayDrawer.deficitAlert', { amount: formatAUD(Math.abs(sweepPoolRemainder)) })}
              </Text>
            </View>
          )}

          {/* Visual Allocation Proportion Bar */}
          <View style={styles.proportionSection}>
            <View style={styles.proportionBar}>
              <View style={[styles.barSegment, { width: `${billsPercent}%`, backgroundColor: '#3B82F6' }]} />
              <View style={[styles.barSegment, { width: `${goalsPercent}%`, backgroundColor: '#6366F1' }]} />
              <View style={[styles.barSegment, { width: `${surplusPercent}%`, backgroundColor: '#10B981' }]} />
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>
                  {t('paydayDrawer.bills')} {formatAUD(billsAllocated)}
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                <Text style={styles.legendText}>
                  {t('paydayDrawer.goals')} {formatAUD(goalsAllocated)}
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>
                  {t('paydayDrawer.surplus')} {formatAUD(Math.max(0, sweepPoolRemainder))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeaderToggle: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  toggleTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleAmountText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  detailsBody: {
    padding: 14,
    paddingTop: 4,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  amountModifiedNotice: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  amountModifiedText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
  },
  reRunWaterfallBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  reRunWaterfallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  surplusCard: {
    padding: 16,
    gap: 12,
  },
  deficitCard: {
    padding: 16,
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sweepBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sweepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
    color: '#059669',
  },
  deficitAmount: {
    color: '#DC2626',
  },
  gaugeSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  deficitAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 10,
    padding: 8,
  },
  deficitAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1,
  },
  proportionSection: {
    gap: 8,
    paddingTop: 4,
  },
  proportionBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
  },
});
