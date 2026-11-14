import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EstimatedCategoryItem, convertFromMonthly, convertToMonthly, SetupFrequency } from '@money-matters/types';
import { DESIGN_TOKENS, AmountInput, InfoTooltip } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface SetupCategoryRowProps {
  cat: EstimatedCategoryItem;
  freq: SetupFrequency;
  isLastEveryday?: boolean;
  onUpdateAmount: (monthlyAmount: number) => void;
  onUpdateFreq: (freq: SetupFrequency) => void;
  onToggleBillType?: (newType: 'RECURRING' | 'TARGET_BALANCE') => void;
  onEditCategory?: () => void;
  onRemove: () => void;
}

const FREQ_KEYS = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

function getFreqSuffixLabel(freq: (typeof FREQ_KEYS)[number]): string {
  if (freq === 'WEEKLY') return t('setup.freqSuffixWk');
  if (freq === 'FORTNIGHTLY') return t('setup.freqSuffixFn');
  if (freq === 'QUARTERLY') return t('setup.freqSuffixQtr');
  if (freq === 'YEARLY') return t('setup.freqSuffixYr');
  return t('setup.freqSuffixMo');
}

export function SetupCategoryRow({
  cat,
  freq,
  isLastEveryday = false,
  onUpdateAmount,
  onUpdateFreq,
  onToggleBillType,
  onEditCategory,
  onRemove,
}: SetupCategoryRowProps) {
  const displayVal = convertFromMonthly(cat.monthlyAud, freq);
  const isBill = cat.type === 'BILL';
  const isFlexible = cat.fundingMode === 'TARGET_BALANCE';
  const isSpecial =
    cat.envelopeType === 'EVERYDAY' ||
    (cat.type === 'EVERYDAY' && isLastEveryday) ||
    Boolean(cat.isSurplusTarget);

  return (
    <View style={styles.row}>
      <View style={styles.titleCol}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.name} numberOfLines={1}>
            {cat.icon || '📌'} {cat.name}
          </Text>
          {isBill && onToggleBillType && (
            <TouchableOpacity
              onPress={() => onToggleBillType(isFlexible ? 'RECURRING' : 'TARGET_BALANCE')}
              style={[styles.typeBadge, isFlexible ? styles.flexibleBadge : styles.scheduledBadge]}
            >
              <Text style={isFlexible ? styles.flexibleBadgeText : styles.scheduledBadgeText}>
                {isFlexible ? t('categories.flexibleBillBadge') : t('categories.scheduledBillBadge')}
              </Text>
            </TouchableOpacity>
          )}
          {isBill && !isFlexible && cat.generateEvents === false && (
            <View style={[styles.typeBadge, styles.flexibleBadge]}>
              <Text style={styles.flexibleBadgeText}>{t('categories.badgeEventsOff')}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.inputCol}>
        <View style={styles.amountWrap}>
          <AmountInput
            value={displayVal ? String(displayVal) : ''}
            containerStyle={styles.compactAmountWrap}
            style={styles.compactAmountInput}
            onChangeText={(txt) => {
              const num = parseFloat(txt) || 0;
              onUpdateAmount(convertToMonthly(num, freq));
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.freqBadge}
          onPress={() => {
            const nextIdx = (FREQ_KEYS.indexOf(freq) + 1) % FREQ_KEYS.length;
            onUpdateFreq(FREQ_KEYS[nextIdx]!);
          }}
        >
          <Text style={styles.freqText}>{getFreqSuffixLabel(freq)}</Text>
        </TouchableOpacity>
        {onEditCategory && (
          <TouchableOpacity onPress={onEditCategory} style={styles.editBtn}>
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        )}
        {isSpecial ? (
          <InfoTooltip content={t('categories.cannotDeleteSpecialEnvelope')} />
        ) : (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.removeBtn}>✕</Text>
          </TouchableOpacity>
        )}
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
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  titleCol: { flex: 1, marginRight: 8 },
  name: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  titleWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  scheduledBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  scheduledBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  flexibleBadge: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderColor: DESIGN_TOKENS.colors.slate[300],
  },
  flexibleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  inputCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountWrap: { width: 104 },
  compactAmountWrap: { marginBottom: 0 },
  compactAmountInput: {
    height: 38,
    paddingVertical: 0,
    fontSize: 13,
  },
  freqBadge: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freqText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  removeBtn: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[400], paddingHorizontal: 4 },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  editBtnText: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
});
