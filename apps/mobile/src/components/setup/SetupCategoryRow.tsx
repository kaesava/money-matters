import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EstimatedCategoryItem } from '@money-matters/types';
import { DESIGN_TOKENS, AmountInput } from '@money-matters/ui/mobile';

interface SetupCategoryRowProps {
  cat: EstimatedCategoryItem;
  freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY';
  onUpdateAmount: (monthlyAmount: number) => void;
  onUpdateFreq: (freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY') => void;
  onToggleBillType?: (newType: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
  onEditCategory?: () => void;
  onRemove: () => void;
}

const FREQS = [
  { key: 'WEEKLY', label: '/wk' },
  { key: 'FORTNIGHTLY', label: '/fn' },
  { key: 'MONTHLY', label: '/mo' },
  { key: 'YEARLY', label: '/yr' },
] as const;

export function SetupCategoryRow({
  cat,
  freq,
  onUpdateAmount,
  onUpdateFreq,
  onToggleBillType,
  onEditCategory,
  onRemove,
}: SetupCategoryRowProps) {
  const convertFromMonthly = (monthly: number, f: typeof freq) => {
    if (f === 'WEEKLY') return Math.round(monthly / (52 / 12));
    if (f === 'FORTNIGHTLY') return Math.round(monthly / (26 / 12));
    if (f === 'YEARLY') return Math.round(monthly * 12);
    return Math.round(monthly);
  };

  const convertToMonthly = (amount: number, f: typeof freq) => {
    if (f === 'WEEKLY') return Math.round(amount * (52 / 12));
    if (f === 'FORTNIGHTLY') return Math.round(amount * (26 / 12));
    if (f === 'YEARLY') return Math.round(amount / 12);
    return Math.round(amount);
  };

  const displayVal = convertFromMonthly(cat.monthlyAud, freq);
  const isBill = cat.type === 'REGULAR';
  const isFlexible = cat.envelopeType === 'FLEXIBLE_BILL';

  return (
    <View style={styles.row}>
      <View style={styles.titleCol}>
        <View style={styles.titleWithBadge}>
          {onEditCategory ? (
            <TouchableOpacity onPress={onEditCategory} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={[styles.name, styles.nameClickable]} numberOfLines={1}>{cat.icon || '📌'} {cat.name}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.name} numberOfLines={1}>{cat.icon || '📌'} {cat.name}</Text>
          )}
          {isBill && onToggleBillType && (
            <TouchableOpacity
              onPress={() => onToggleBillType(isFlexible ? 'SCHEDULED_BILL' : 'FLEXIBLE_BILL')}
              style={[styles.typeBadge, isFlexible ? styles.flexibleBadge : styles.scheduledBadge]}
            >
              <Text style={isFlexible ? styles.flexibleBadgeText : styles.scheduledBadgeText}>
                {isFlexible ? 'Flexible' : 'Scheduled'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.inputCol}>
        <View style={styles.amountWrap}>
          <AmountInput
            value={displayVal ? String(displayVal) : ''}
            onChangeText={(txt) => {
              const num = parseFloat(txt) || 0;
              onUpdateAmount(convertToMonthly(num, freq));
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.freqBadge}
          onPress={() => {
            const nextIdx = (FREQS.findIndex(f => f.key === freq) + 1) % FREQS.length;
            onUpdateFreq(FREQS[nextIdx]!.key);
          }}
        >
          <Text style={styles.freqText}>{FREQS.find(f => f.key === freq)?.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleCol: { flex: 1, marginRight: 8 },
  name: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  nameClickable: { color: DESIGN_TOKENS.colors.accent },
  titleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  scheduledBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  scheduledBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  flexibleBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  flexibleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  inputCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountWrap: { width: 90 },
  freqBadge: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freqText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  removeBtn: { fontSize: 13, fontWeight: '700', color: '#94A3B8', paddingHorizontal: 4 },
});
