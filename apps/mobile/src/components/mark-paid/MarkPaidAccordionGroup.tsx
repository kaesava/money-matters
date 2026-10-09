import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';
import { FundingPoolItem } from './mark-paid-types';

interface MarkPaidAccordionGroupProps {
  typeKey: string;
  poolsInGroup: FundingPoolItem[];
  isExpanded: boolean;
  transferAmounts: Record<string, string>;
  shortfallAmount: number;
  totalAllocated: number;
  onToggle: () => void;
  onAmountChange: (poolId: string, maxBal: number, rawVal: string) => void;
}

export function MarkPaidAccordionGroup({
  typeKey,
  poolsInGroup,
  isExpanded,
  transferAmounts,
  shortfallAmount,
  totalAllocated,
  onToggle,
  onAmountChange,
}: MarkPaidAccordionGroupProps) {
  const typeLabel =
    typeKey === 'REGULAR'
      ? t('incomeBillsTabs.bills')
      : typeKey === 'EVERYDAY'
        ? t('incomeBillsTabs.everyday')
        : t('incomeBillsTabs.goals');

  return (
    <View style={styles.accordionGroup}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.accordionHeader}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderLeft}>
          <Text style={styles.accordionTitle}>
            {typeLabel} {t('categories.title')}
          </Text>
          <View style={styles.accordionCountBadge}>
            <Text style={styles.accordionCountText}>{poolsInGroup.length}</Text>
          </View>
        </View>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={DESIGN_TOKENS.colors.slate[500]}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.poolItemsList}>
          {poolsInGroup.map((pool) => {
            const b = typeof pool.currentBalance === 'number'
              ? pool.currentBalance
              : parseFloat(String(pool.currentBalance) || '0');
            const currentVal = transferAmounts[pool.id] ?? '';

            return (
              <View key={pool.id} style={styles.poolItemRow}>
                <View style={styles.poolItemInfo}>
                  <View style={styles.poolNameRow}>
                    <Text style={styles.poolItemName}>{pool.name}</Text>
                    {pool.isSurplusTarget && (
                      <View style={styles.surplusBadge}>
                        <Text style={styles.surplusBadgeText}>{t('incomeBillsTabs.surplus')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.poolItemBal}>
                    {t('incomeBillsTabs.available', { amount: formatAUD(b) })}
                  </Text>
                </View>

                <View style={styles.poolItemInputWrap}>
                  <TextInput
                    style={styles.poolAmountInput}
                    value={currentVal}
                    onChangeText={(val) => onAmountChange(pool.id, b, val)}
                    placeholder="0.00"
                    placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
                    keyboardType="decimal-pad"
                    selectTextOnFocus={true}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const currentAlloc = parseFloat(currentVal) || 0;
                      const rem = Math.max(0, shortfallAmount - (totalAllocated - currentAlloc));
                      const maxAllowed = Math.min(b, rem > 0 ? rem : b);
                      onAmountChange(pool.id, b, maxAllowed.toFixed(2));
                    }}
                    style={styles.maxBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.maxBtnText}>{t('incomeBillsTabs.max')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  accordionGroup: {
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  accordionCountBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  accordionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  poolItemsList: {
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  poolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  poolItemInfo: {
    flex: 1,
  },
  poolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  surplusBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  surplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  poolItemBal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 1,
  },
  poolItemInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[300],
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    overflow: 'hidden',
  },
  poolAmountInput: {
    width: 75,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    textAlign: 'right',
  },
  maxBtn: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: DESIGN_TOKENS.colors.slate[200],
  },
  maxBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[600],
  },
});
