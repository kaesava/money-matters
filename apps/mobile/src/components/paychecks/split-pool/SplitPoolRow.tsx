import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { AllocationLineItem, PoolRecord } from '../MobileIncomeSplitPoolList';
import { SplitPoolReasoningField } from './SplitPoolReasoningField';

interface SplitPoolRowProps {
  item: AllocationLineItem;
  poolObj?: PoolRecord;
  groupType: 'EVERYDAY' | 'REGULAR' | 'GOAL';
  isSweep: boolean;
  sweepRemainder: number;
  linesMap: Record<string, string>;
  reasoningMap: Record<string, string>;
  isReadOnly: boolean;
  isReasoningOpen: boolean;
  onToggleReasoning: () => void;
  onLineAmountChange: (poolId: string, val: string) => void;
  onLineReasoningChange: (poolId: string, val: string) => void;
}

export const SplitPoolRow: React.FC<SplitPoolRowProps> = ({
  item,
  poolObj,
  groupType,
  isSweep,
  sweepRemainder,
  linesMap,
  reasoningMap,
  isReadOnly,
  isReasoningOpen,
  onToggleReasoning,
  onLineAmountChange,
  onLineReasoningChange,
}) => {
  const curBal = poolObj ? parseFloat(String(poolObj.currentBalance || '0')) : 0;
  const targetRaw = poolObj?.poolType === 'EVERYDAY'
    ? poolObj.everydayAllowanceAmount || poolObj.targetAmount
    : poolObj?.targetAmount;
  const targetNum = targetRaw ? parseFloat(String(targetRaw)) : 0;

  const currentValStr = isSweep
    ? sweepRemainder.toFixed(2)
    : (linesMap[item.bucketId] ?? item.proposedAmount.toFixed(2));

  const isZeroAllocation = (parseFloat(currentValStr) || 0) <= 0;
  const hasReasoning = !isZeroAllocation && Boolean(reasoningMap[item.bucketId] || item.reasoning);

  return (
    <View style={[styles.poolItemCard, isSweep && styles.sweepPoolItemCard]}>
      <View style={styles.poolTopRow}>
        <View style={styles.poolMetaCol}>
          <View style={styles.poolTitleRow}>
            <Text style={styles.poolNameText} numberOfLines={1}>
              {item.bucketName}
            </Text>
            {isSweep && (
              <View style={styles.autoSurplusBadge}>
                <Text style={styles.autoSurplusBadgeText}>
                  {t('paydayDrawer.autoSurplusBadge')}
                </Text>
              </View>
            )}
            {groupType === 'EVERYDAY' && !isReadOnly && curBal > 0 && (
              <TouchableOpacity
                onPress={() => {
                  const curAllocation = parseFloat(linesMap[item.bucketId] ?? item.proposedAmount.toString()) || 0;
                  const adjusted = Math.max(0, curAllocation - curBal);
                  onLineAmountChange(item.bucketId, adjusted.toFixed(2));
                }}
                style={styles.leftoverChip}
                activeOpacity={0.7}
              >
                <Text style={styles.leftoverChipText}>
                  {t('paydayDrawer.leftoverCashReportedBadge', { amount: formatAUD(curBal) })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsMetaRow}>
            <Text style={styles.statMetaText}>
              {t('paydayDrawer.balance')} {formatAUD(curBal)}
            </Text>
            {targetNum > 0 && (
              <Text style={styles.statMetaText}>
                • {t('paydayDrawer.tableColTarget')}: {formatAUD(targetNum)}
                {groupType === 'REGULAR' ? t('paydayDrawer.perMonth') : ''}
                {poolObj?.targetDate ? ` (${formatDate(poolObj.targetDate)})` : ''}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.amountInputCol}>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={[styles.amountInput, isSweep && styles.sweepAmountInput]}
              keyboardType="decimal-pad"
              value={currentValStr}
              editable={!isSweep && !isReadOnly}
              onChangeText={(val) => onLineAmountChange(item.bucketId, val)}
              placeholder="0.00"
              placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
              selectTextOnFocus={true}
            />
          </View>

          <View style={styles.chipsRow}>
            {!isSweep && !isReadOnly && (
              <TouchableOpacity
                onPress={() => onLineAmountChange(item.bucketId, '0.00')}
                style={styles.zeroChip}
              >
                <Text style={styles.zeroChipText}>{t('paydayDrawer.zeroPercent')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onToggleReasoning}
              style={[styles.noteIconBtn, (hasReasoning || isReasoningOpen) && styles.noteIconBtnActive]}
            >
              <Feather
                name="file-text"
                size={12}
                color={hasReasoning || isReasoningOpen ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.slate[400]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isReasoningOpen && (
        <SplitPoolReasoningField
          isZeroAllocation={isZeroAllocation}
          reasoningValue={reasoningMap[item.bucketId] ?? item.reasoning ?? ''}
          isReadOnly={isReadOnly}
          onChangeText={(val) => onLineReasoningChange(item.bucketId, val)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  poolItemCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    gap: 8,
  },
  sweepPoolItemCard: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderLeftWidth: 3,
    borderLeftColor: DESIGN_TOKENS.colors.success,
  },
  poolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  poolMetaCol: {
    flex: 1,
    gap: 2,
  },
  poolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  autoSurplusBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  autoSurplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  leftoverChip: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  leftoverChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  statsMetaRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  statMetaText: {
    fontSize: 10,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  amountInputCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 8,
    width: 110,
  },
  currencyPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    marginRight: 2,
  },
  amountInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
    paddingVertical: 4,
    textAlign: 'right',
  },
  sweepAmountInput: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zeroChip: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zeroChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  noteIconBtn: {
    padding: 3,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  noteIconBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
});
