import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export type FilterType =
  | 'ALL'
  | 'CATEGORY'
  | 'POOL'
  | 'INCOME_SOURCE'
  | 'EXPENSE_SOURCE'
  | 'BANK_ACCOUNT';

export interface ArchivedFilterChipsProps {
  filterType: FilterType;
  onSelectFilter: (type: FilterType) => void;
}

export function ArchivedFilterChips({
  filterType,
  onSelectFilter,
}: ArchivedFilterChipsProps) {
  const filterOptions: { type: FilterType; label: string }[] = [
    { type: 'ALL', label: t('common.all') },
    { type: 'CATEGORY', label: t('settings.archived.categories') },
    { type: 'POOL', label: t('settings.archived.pools') },
    { type: 'INCOME_SOURCE', label: t('settings.archived.income') },
    { type: 'EXPENSE_SOURCE', label: t('settings.archived.expenses') },
    { type: 'BANK_ACCOUNT', label: t('settings.archived.accounts') },
  ];

  return (
    <View style={styles.pillContainer}>
      {filterOptions.map((opt) => (
        <TouchableOpacity
          key={opt.type}
          onPress={() => onSelectFilter(opt.type)}
          style={[styles.pill, filterType === opt.type && styles.pillActive]}
        >
          <Text
            style={[
              styles.pillText,
              filterType === opt.type && styles.pillTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  pillActive: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  pillTextActive: {
    color: DESIGN_TOKENS.colors.onPrimary,
    fontWeight: '700',
  },
});
