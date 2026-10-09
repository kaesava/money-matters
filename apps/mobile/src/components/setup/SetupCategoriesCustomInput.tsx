import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, AmountInput } from '@money-matters/ui/mobile';
import { EstimatedCategoryItem } from '@money-matters/types';

interface SetupCategoriesCustomInputProps {
  onAdd: (cat: EstimatedCategoryItem) => void;
}

const CAT_TYPES: Array<{ key: 'REGULAR' | 'EVERYDAY' | 'GOAL'; label: string }> = [
  { key: 'REGULAR', label: 'setup.categories.typeRegular' },
  { key: 'EVERYDAY', label: 'setup.categories.typeEveryday' },
  { key: 'GOAL', label: 'setup.categories.typeGoal' },
];

export function SetupCategoriesCustomInput({ onAdd }: SetupCategoriesCustomInputProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'REGULAR' | 'EVERYDAY' | 'GOAL'>('REGULAR');
  const [amount, setAmount] = useState('100');

  const handleAdd = () => {
    if (!name.trim()) return;
    const num = parseFloat(amount) || 0;
    const icon = type === 'REGULAR' ? '📌' : type === 'GOAL' ? '🎯' : '🛒';
    onAdd({
      name: name.trim(),
      type,
      monthlyAud: num,
      icon,
    });
    setName('');
    setAmount('100');
  };

  return (
    <View style={styles.customBox}>
      <Text style={styles.customHeading}>{t('setup.addCustomCategory')}</Text>
      <TextInput
        style={styles.customInput}
        value={name}
        onChangeText={setName}
        placeholder={t('setup.addCustomCategoryPlaceholder')}
        placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
      />
      <View style={styles.typeRow}>
        {CAT_TYPES.map((tItem) => (
          <TouchableOpacity
            key={tItem.key}
            style={[styles.typeChip, type === tItem.key && styles.typeChipActive]}
            onPress={() => setType(tItem.key)}
          >
            <Text style={[styles.typeChipText, type === tItem.key && styles.typeChipTextActive]}>
              {t(tItem.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.amountWrap}>
          <AmountInput value={amount} onChangeText={setAmount} placeholder="100" />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!name.trim()}
        >
          <Text style={styles.addBtnText}>+ {t('setup.addCustomCategoryBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customBox: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 12,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 20,
    gap: 8,
  },
  customHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  customInput: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DESIGN_TOKENS.radius.full,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  typeChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  typeChipText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  typeChipTextActive: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  amountWrap: {
    flex: 1,
  },
  addBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: DESIGN_TOKENS.radius.md,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: DESIGN_TOKENS.colors.onAccent,
    fontWeight: '700',
    fontSize: 12,
  },
});
