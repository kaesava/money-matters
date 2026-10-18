import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../../tokens';

export interface FilterSortOption<T = string> {
  id: T;
  label: string;
}

interface MobileFilterSortSectionProps<TSort = string> {
  sortOptions: FilterSortOption<TSort>[];
  sortField?: TSort;
  sortOrder?: 'asc' | 'desc';
  onSortFieldChange: (field: TSort) => void;
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
}

export function MobileFilterSortSection<TSort = string>({
  sortOptions,
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
}: MobileFilterSortSectionProps<TSort>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('transactions.sortLabel')}</Text>
      </View>
      <View style={styles.chipsWrap}>
        {sortOptions.map((opt) => {
          const isSelected = sortField === opt.id;
          const handlePress = () => {
            if (isSelected && onSortOrderChange && sortOrder) {
              onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              onSortFieldChange(opt.id);
            }
          };
          return (
            <TouchableOpacity
              key={String(opt.id)}
              onPress={handlePress}
              style={[styles.chip, isSelected && styles.chipActive]}
              activeOpacity={0.7}
            >
              <View style={styles.chipContent}>
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {opt.label}
                </Text>
                {isSelected && sortOrder && (
                  <Feather
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={DESIGN_TOKENS.colors.sereneBlue}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  chipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  chipTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '800',
  },
});
